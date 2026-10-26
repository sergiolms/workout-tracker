import { defaultState, type AppState } from './storage.ts';
import {
  CloudConflict,
  mergeStates,
  type FieldConflict,
} from './cloud-records.ts';

export type PersistenceStatus = {
  local: 'saving' | 'saved' | 'error';
  cloud: 'pending' | 'synced' | 'error';
  canEdit: boolean;
  error: string;
  conflicts?: FieldConflict[];
};
type Dependencies = {
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

export class WorkoutPersistence {
  state: AppState = defaultState;
  status: PersistenceStatus = {
    local: 'saved',
    cloud: 'pending',
    canEdit: false,
    error: '',
  };
  private active = true;
  private revision = 0;
  private localQueue: Promise<void> = Promise.resolve();
  private running: Promise<void> | null = null;
  private reconciled = false;
  private pending = false;
  private cloudVersion: string | null = null;
  private base: AppState = defaultState;
  private stopListening?: () => void;
  private incoming: AppState | null = null;
  private conflictRemote: AppState | null = null;
  private recovered: { base: AppState; state: AppState } | null = null;
  private pendingReadFailed = false;
  private dependencies: Dependencies;
  private listeners = new Set<() => void>();
  private snapshot = { state: this.state, status: { ...this.status } };

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  constructor(dependencies: Dependencies) {
    this.dependencies = dependencies;
  }

  private emit() {
    if (!this.active) return;
    this.snapshot = { state: this.state, status: { ...this.status } };
    this.listeners.forEach((listener) => listener());
    this.dependencies.onChange?.(this.state, this.snapshot.status);
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
    const next = updater(this.state);
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
    if (!this.active) return Promise.resolve();
    if (this.status.conflicts?.length) return Promise.resolve();
    if (this.running) return this.running;
    if (
      this.reconciled &&
      !this.pending &&
      !this.incoming &&
      this.status.cloud === 'synced'
    )
      return Promise.resolve();
    this.running = this.synchronize().finally(() => {
      this.running = null;
      if (
        (this.incoming || this.pending) &&
        this.status.cloud !== 'error' &&
        this.status.canEdit &&
        !this.status.conflicts?.length
      )
        void this.sync();
    });
    return this.running;
  }

  private async synchronize() {
    try {
      if (this.pendingReadFailed) {
        this.recovered = (await this.dependencies.loadPending?.()) ?? null;
        this.pendingReadFailed = false;
      }
      if (!this.reconciled) {
        let remote = await this.dependencies.loadCloud();
        if (this.recovered && remote?.history && !remote.history.complete) {
          if (!this.dependencies.loadFullCloud)
            throw Error(
              'No se pueden reconciliar cambios pendientes con un historial incompleto.',
            );
          remote = await this.dependencies.loadFullCloud();
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
        const remote = await this.dependencies.loadCloud();
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
      this.status.cloud = this.pending ? 'pending' : 'synced';
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
      cloud: this.pending ? 'pending' : 'synced',
      canEdit: true,
      error: '',
    };
    this.emit();
  }

  async resolveConflicts(choices: Record<string, 'local' | 'remote'>) {
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
    this.active = false;
    this.stopListening?.();
    this.listeners.clear();
  }
}
