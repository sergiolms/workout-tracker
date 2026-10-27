import { type QueryClient, queryOptions } from '@tanstack/react-query';
import { createAccountQueryClient } from './account-query.ts';
import { accrueGym } from './gym/engine.ts';
import { defaultState, type AppState } from './storage.ts';
import {
  CloudConflict,
  mergeStates,
  type FieldConflict,
} from './cloud-records.ts';

export type PersistenceStatus = {
  localOnly?: boolean;
  local: 'saving' | 'saved' | 'error';
  cloud: 'pending' | 'synced' | 'local' | 'error';
  canEdit: boolean;
  error: string;
  conflicts?: FieldConflict[];
};
export type SyncDependencies = {
  client?: QueryClient;
  accountId?: string;
  localOnly?: boolean;
  dispose?: () => void;
  loadLocal: () => Promise<AppState | null>;
  saveLocal: (state: AppState) => Promise<void>;
  backup: (state: AppState, source: 'local' | 'cloud') => Promise<void>;
  loadCloud: () => Promise<AppState | null>;
  loadFullCloud?: () => Promise<AppState>;
  saveCloud: (
    state: AppState,
    expectedVersion: string | null,
    base?: AppState,
  ) => Promise<AppState | void>;
  subscribeCloud?: (
    change: (state: AppState) => void,
    error: (reason: unknown) => void,
  ) => () => void;
  loadPending?: () => Promise<{ base: AppState; state: AppState } | null>;
  savePending?: (
    pending: { base: AppState; state: AppState } | null,
  ) => Promise<void>;
  onChange?: (state: AppState, status: PersistenceStatus) => void;
};

// Checked inside the Firestore transaction, including on automatic retries.
export function assertCloudVersion(
  actual: string | null,
  expected: string | null,
) {
  if (actual !== expected)
    throw new Error(
      'El plan ha cambiado en otro dispositivo. Descarga una copia de tus cambios y recarga para obtener la versión de Firebase.',
    );
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const connectionError = (error: unknown) => {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
  return [
    'unavailable',
    'deadline-exceeded',
    'network-request-failed',
    'auth/network-request-failed',
  ].includes(code);
};

export class AccountSync {
  readonly client: QueryClient;
  readonly accountId: string;
  readonly stateKey: readonly string[];
  readonly statusKey: readonly string[];
  get state(): AppState {
    return this.client.getQueryData<AppState>(this.stateKey) ?? defaultState;
  }
  private set state(value: AppState) {
    if (this.active) this.client.setQueryData(this.stateKey, value);
  }
  get status(): PersistenceStatus {
    return this.client.getQueryData<PersistenceStatus>(this.statusKey)!;
  }
  private set status(value: PersistenceStatus) {
    if (this.active) this.client.setQueryData(this.statusKey, value);
  }
  private active = true;
  private revision = 0;
  private localQueue: Promise<void> = Promise.resolve();
  private reconciled = false;
  private pending = false;
  private cloudVersion: string | null = null;
  private base: AppState = defaultState;
  private stopListening?: () => void;
  private incoming: AppState | null = null;
  private conflictRemote: AppState | null = null;
  private recovered: { base: AppState; state: AppState } | null = null;
  private pendingReadFailed = false;
  private initialized = false;
  private dependencies: SyncDependencies;
  get canEdit() {
    return this.active && this.status.canEdit;
  }
  constructor(dependencies: SyncDependencies) {
    this.dependencies = dependencies;
    this.client = dependencies.client ?? createAccountQueryClient();
    this.accountId = dependencies.accountId ?? crypto.randomUUID();
    this.stateKey = ['account', this.accountId, 'state'];
    this.statusKey = ['account', this.accountId, 'status'];
    this.client.setQueryDefaults(this.statusKey, {
      gcTime: Infinity,
      structuralSharing: false,
    });
    this.client.setQueryData(this.stateKey, defaultState);
    void this.client.invalidateQueries({
      queryKey: this.stateKey,
      exact: true,
      refetchType: 'none',
    });
    this.status = {
      local: 'saved',
      cloud: 'pending',
      canEdit: false,
      error: '',
      ...(dependencies.localOnly ? { localOnly: true } : {}),
    };
  }

  queryOptions() {
    return queryOptions({
      queryKey: this.stateKey,
      queryFn: async () => {
        if (!this.initialized) await this.initialize();
        await this.sync();
        return this.state;
      },
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
      networkMode: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
  }

  private emit() {
    if (!this.active) return;
    this.status = {
      ...this.status,
      ...(this.dependencies.localOnly ? { localOnly: true } : {}),
    };
    this.dependencies.onChange?.(this.state, this.status);
  }

  private readCloud(target: 'current' | 'all') {
    return this.client.query({
      queryKey: ['account', this.accountId, 'read', target],
      queryFn: async ({ signal }) => {
        signal.throwIfAborted();
        if (!this.active) throw Error('La cuenta activa ha cambiado.');
        const value = await (target === 'all'
          ? this.dependencies.loadFullCloud!()
          : this.dependencies.loadCloud());
        signal.throwIfAborted();
        if (!this.active) throw Error('La cuenta activa ha cambiado.');
        return value;
      },
      staleTime: 0,
      gcTime: 0,
      retry: false,
      networkMode: 'always',
    });
  }

  private queueRemote(value: AppState) {
    if (!this.active) return;
    if (value.cloudRevision !== undefined) {
      if (
        this.base.cloudRevision !== undefined &&
        (value.cloudRevision < this.base.cloudRevision ||
          (value.cloudRevision === this.base.cloudRevision &&
            (value.history?.generation ?? 0) <=
              (this.base.history?.generation ?? 0)))
      )
        return;
      if (
        this.incoming?.cloudRevision !== undefined &&
        (value.cloudRevision < this.incoming.cloudRevision ||
          (value.cloudRevision === this.incoming.cloudRevision &&
            (value.history?.generation ?? 0) <
              (this.incoming.history?.generation ?? 0)))
      )
        return;
    }
    this.incoming = value;
  }

  async initialize() {
    this.initialized = true;
    try {
      const local = await this.dependencies.loadLocal();
      if (!this.active) return;
      this.state = local ?? defaultState;
      this.emit();
    } catch (error) {
      this.status.local = 'error';
      this.status.error = message(error);
      this.emit();
    }
    try {
      this.recovered = (await this.dependencies.loadPending?.()) ?? null;
    } catch (error) {
      this.pendingReadFailed = true;
      this.status.local = 'error';
      this.status.error = message(error);
      this.emit();
    }
  }

  update(updater: (current: AppState) => AppState) {
    if (!this.active || !this.status.canEdit) return;
    const next = accrueGym(this.state, updater(this.state));
    if (next === this.state) return;
    this.revision++;
    const updatedAt = new Date(
      Math.max(Date.now(), (Date.parse(this.state.updatedAt ?? '') || 0) + 1),
    ).toISOString();
    this.state = { ...next, updatedAt };
    this.pending = true;
    this.status = {
      local: 'saving',
      cloud: 'pending',
      canEdit: true,
      error: '',
    };
    this.emit();
    void this.persist()
      .then(() => this.sync())
      .catch(() => undefined);
  }

  private persist() {
    const snapshot = this.state;
    const revision = this.revision;
    const task = this.localQueue
      .catch(() => undefined)
      .then(async () => {
        try {
          await this.dependencies.saveLocal(snapshot);
          if (this.pending)
            await this.dependencies.savePending?.({
              base: this.base,
              state: snapshot,
            });
          if (this.active && revision === this.revision) {
            this.status.local = 'saved';
            this.emit();
          }
        } catch (error) {
          if (this.active) {
            this.status.local = 'error';
            this.status.canEdit = false;
            this.status.error = message(error);
            this.emit();
          }
          throw error;
        }
      });
    this.localQueue = task;
    return task;
  }

  sync(): Promise<void> {
    if (!this.active || this.status.conflicts?.length) return Promise.resolve();
    if (
      this.reconciled &&
      !this.pending &&
      !this.incoming &&
      (this.status.cloud === 'synced' || this.status.cloud === 'local')
    )
      return Promise.resolve();
    const mutation = this.client.getMutationCache().build(this.client, {
      mutationKey: ['account', this.accountId, 'save'],
      scope: { id: `account:${this.accountId}` },
      networkMode: 'always',
      gcTime: Infinity,
      retry: false,
      mutationFn: () => this.synchronize(),
      onSuccess: () => {
        if (
          this.active &&
          (this.incoming || this.pending) &&
          !this.status.conflicts?.length
        )
          void this.sync();
      },
    });
    return mutation
      .execute(undefined)
      .catch(() => undefined)
      .finally(() => {
        this.client.getMutationCache().remove(mutation);
      });
  }

  private async synchronize() {
    if (!this.active || this.status.conflicts?.length) return;
    try {
      if (this.pendingReadFailed) {
        this.recovered = (await this.dependencies.loadPending?.()) ?? null;
        this.pendingReadFailed = false;
      }
      if (!this.reconciled) {
        let remote = await this.readCloud('current');
        if (this.recovered && remote?.history && !remote.history.complete) {
          if (!this.dependencies.loadFullCloud)
            throw Error(
              'No se pueden reconciliar cambios pendientes con un historial incompleto.',
            );
          remote = (await this.readCloud('all'))!;
        }
        if (!this.active) return;
        // Cache contents never become a cloud write on startup, even if the
        // cache has a newer clock or Firebase has no document for this account.
        await this.dependencies.backup(this.state, 'local');
        if (remote) await this.dependencies.backup(remote, 'cloud');
        if (!this.active) return;
        this.state = remote ?? defaultState;
        this.base = this.state;
        this.cloudVersion = remote?.updatedAt ?? null;
        this.revision++;
        await this.persist();
        if (!this.active) return;
        this.reconciled = true;
        this.stopListening = this.dependencies.subscribeCloud?.(
          (value) => {
            this.queueRemote(value);
            void this.sync();
          },
          (error) => {
            if (this.active) {
              this.status.cloud = 'error';
              this.status.canEdit =
                this.reconciled &&
                this.status.local !== 'error' &&
                connectionError(error);
              this.status.error = message(error);
              this.emit();
            }
          },
        );
        if (this.recovered) {
          const recovered = this.recovered;
          this.recovered = null;
          const merged = mergeStates(
            recovered.base,
            recovered.state,
            this.base,
          );
          this.state = merged.state;
          this.pending = true;
          if (merged.conflicts.length) {
            this.base = recovered.base;
            throw new CloudConflict(merged.conflicts, remote ?? defaultState);
          }
          await this.persist();
        }
      } else if (this.status.local === 'error') {
        await this.persist();
      }
      if (
        this.reconciled &&
        this.status.cloud === 'error' &&
        !this.pending &&
        this.dependencies.subscribeCloud
      ) {
        const remote = await this.readCloud('current');
        if (remote) this.queueRemote(remote);
      }
      while (this.pending) {
        await this.localQueue;
        if (!this.active) return;
        const revision = this.revision;
        const snapshot = this.state;
        const confirmed = await this.dependencies.saveCloud(
          snapshot,
          this.cloudVersion,
          this.base,
        );
        if (!this.active) return;
        if (confirmed) {
          const merged = mergeStates(snapshot, this.state, confirmed);
          if (merged.conflicts.length) {
            this.base = snapshot;
            throw new CloudConflict(merged.conflicts, confirmed);
          }
          this.base = confirmed;
          this.state = {
            ...merged.state,
            updatedAt:
              revision === this.revision
                ? confirmed.updatedAt
                : this.state.updatedAt,
          };
          await this.persist();
        }
        this.base = confirmed ?? snapshot;
        this.cloudVersion = this.base.updatedAt ?? null;
        if (revision === this.revision) this.pending = false;
      }
      await this.receiveRemote();
      if (this.status.conflicts?.length) return;
      const revision = this.revision;
      const clear = this.localQueue.then(async () => {
        if (!this.active || this.pending || revision !== this.revision) return;
        await this.dependencies.savePending?.(null);
      });
      this.localQueue = clear;
      await clear;
      if (!this.active) return;
      this.status.cloud = this.pending
        ? 'pending'
        : this.dependencies.localOnly
          ? 'local'
          : 'synced';
      this.status.canEdit = true;
      this.status.error = '';
      this.emit();
    } catch (error) {
      if (!this.active) return;
      this.status.cloud = 'error';
      this.status.canEdit =
        this.reconciled &&
        this.status.local !== 'error' &&
        connectionError(error);
      this.status.error = message(error);
      if (error instanceof CloudConflict) {
        this.status.conflicts = error.conflicts;
        this.conflictRemote = error.remote;
      }
      this.emit();
      throw error;
    }
  }

  private async receiveRemote() {
    if (!this.active || !this.incoming || this.status.conflicts?.length) return;
    const remote = this.incoming;
    this.incoming = null;
    if (
      remote.cloudRevision !== undefined &&
      this.base.cloudRevision !== undefined &&
      (remote.cloudRevision < this.base.cloudRevision ||
        (remote.cloudRevision === this.base.cloudRevision &&
          (remote.history?.generation ?? 0) <=
            (this.base.history?.generation ?? 0)))
    )
      return;
    const merged = mergeStates(this.base, this.state, remote);
    if (merged.conflicts.length) {
      this.status = {
        ...this.status,
        cloud: 'error',
        canEdit: false,
        error: 'Hay cambios en los mismos datos desde otro dispositivo.',
        conflicts: merged.conflicts,
      };
      this.conflictRemote = remote;
      this.emit();
      return;
    }
    this.base = remote;
    this.cloudVersion = remote.updatedAt ?? null;
    this.state = merged.state;
    if (!this.pending) this.state = remote;
    this.revision++;
    await this.persist();
    this.status = {
      ...this.status,
      cloud: this.pending
        ? 'pending'
        : this.dependencies.localOnly
          ? 'local'
          : 'synced',
      canEdit: true,
      error: '',
    };
    this.emit();
  }

  async resolveConflicts(choices: Record<string, 'local' | 'remote'>) {
    if (!this.active) return;
    if (!this.conflictRemote || !this.status.conflicts?.length) return;
    const remote = this.conflictRemote;
    const merged = mergeStates(this.base, this.state, remote, choices);
    if (merged.conflicts.length) {
      this.status.conflicts = merged.conflicts;
      this.emit();
      return;
    }
    this.base = remote;
    this.cloudVersion = remote.updatedAt ?? null;
    this.state = merged.state;
    this.conflictRemote = null;
    this.status = {
      local: 'saving',
      cloud: 'pending',
      canEdit: true,
      error: '',
    };
    this.revision++;
    this.pending = true;
    await this.persist();
    await this.sync();
  }

  async flushLocal() {
    await this.localQueue;
  }
  async hydrate(load: () => Promise<AppState>) {
    if (!this.active) throw Error('La cuenta activa ha cambiado.');
    const remote = await load();
    if (!this.active) throw Error('La cuenta activa ha cambiado.');
    this.queueRemote(remote);
    await this.sync();
    while (
      this.active &&
      this.incoming &&
      !this.status.conflicts?.length &&
      this.status.cloud !== 'error'
    )
      await this.sync();
    return this.state;
  }
  dispose() {
    if (!this.active) return;
    this.active = false;
    this.stopListening?.();
    this.dependencies.dispose?.();
  }
}
