import { defaultState, type AppState } from './storage.ts';

export type PersistenceStatus = { local: 'saving' | 'saved' | 'error'; cloud: 'pending' | 'synced' | 'error'; canEdit: boolean; error: string };
type Dependencies = {
  loadLocal: () => Promise<AppState | null>;
  saveLocal: (state: AppState) => Promise<void>;
  backup: (state: AppState, source: 'local' | 'cloud') => Promise<void>;
  loadCloud: () => Promise<AppState | null>;
  saveCloud: (state: AppState, expectedVersion: string | null) => Promise<void>;
  onChange: (state: AppState, status: PersistenceStatus) => void;
};

// Checked inside the Firestore transaction, including on automatic retries.
export function assertCloudVersion(actual: string | null, expected: string | null) {
  if (actual !== expected) throw new Error('El plan ha cambiado en otro dispositivo. Descarga una copia de tus cambios y recarga para obtener la versión de Firebase.');
}

const message = (error: unknown) => error instanceof Error ? error.message : String(error);

export class WorkoutPersistence {
  state: AppState = defaultState;
  status: PersistenceStatus = { local: 'saved', cloud: 'pending', canEdit: false, error: '' };
  private active = true;
  private revision = 0;
  private localQueue: Promise<void> = Promise.resolve();
  private running: Promise<void> | null = null;
  private reconciled = false;
  private pending = false;
  private cloudVersion: string | null = null;
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) { this.dependencies = dependencies; }

  private emit() {
    if (this.active) this.dependencies.onChange(this.state, { ...this.status });
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
  }

  update(updater: (current: AppState) => AppState) {
    if (!this.active || !this.status.canEdit) return;
    this.revision++;
    const updatedAt = new Date(Math.max(Date.now(), (Date.parse(this.state.updatedAt ?? '') || 0) + 1)).toISOString();
    this.state = { ...updater(this.state), updatedAt };
    this.pending = true;
    this.status = { local: 'saving', cloud: 'pending', canEdit: true, error: '' };
    this.emit();
    void this.persist().then(() => this.sync()).catch(() => undefined);
  }

  private persist() {
    const snapshot = this.state;
    const revision = this.revision;
    const task = this.localQueue.catch(() => undefined).then(async () => {
      try {
        await this.dependencies.saveLocal(snapshot);
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
    if (this.running) return this.running;
    if (this.reconciled && !this.pending && this.status.cloud === 'synced') return Promise.resolve();
    this.running = this.synchronize().finally(() => { this.running = null; });
    return this.running;
  }

  private async synchronize() {
    try {
      if (!this.reconciled) {
        const remote = await this.dependencies.loadCloud();
        if (!this.active) return;
        // Cache contents never become a cloud write on startup, even if the
        // cache has a newer clock or Firebase has no document for this account.
        await this.dependencies.backup(this.state, 'local');
        if (remote) await this.dependencies.backup(remote, 'cloud');
        if (!this.active) return;
        this.state = remote ?? defaultState;
        this.cloudVersion = remote?.updatedAt ?? null;
        this.revision++;
        await this.persist();
        if (!this.active) return;
        this.reconciled = true;
      } else if (this.status.local === 'error') {
        await this.persist();
      }
      while (this.pending) {
        await this.localQueue;
        if (!this.active) return;
        const revision = this.revision;
        const snapshot = this.state;
        await this.dependencies.saveCloud(snapshot, this.cloudVersion);
        if (!this.active) return;
        this.cloudVersion = snapshot.updatedAt ?? null;
        if (revision === this.revision) this.pending = false;
      }
      this.status.cloud = 'synced';
      this.status.canEdit = true;
      this.status.error = '';
      this.emit();
    } catch (error) {
      if (!this.active) return;
      this.status.cloud = 'error';
      this.status.canEdit = false;
      this.status.error = message(error);
      this.emit();
    }
  }

  async flushLocal() { await this.localQueue; }
  dispose() { this.active = false; }
}
