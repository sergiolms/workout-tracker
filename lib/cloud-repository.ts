import {
  CloudConflict,
  canonical,
  equal,
  mergeValue,
  pathSegment,
  recordsState,
  stateRecords,
  type StateRecords,
} from './cloud-records.ts';
import { defaultState, migrateState, type AppState } from './storage.ts';

export type StoredRecord = {
  key: string;
  value?: unknown;
  deleted: boolean;
  sequence: number;
};
export type CloudHeader = {
  schema: 1;
  collection: string;
  sequence: number;
  updatedAt: string;
  source: string;
  verifiedRecords: number;
};
export type CloudTransaction = {
  get: (path: string) => Promise<unknown>;
  set: (path: string, value: unknown) => void;
};
export type RecordDatabase = {
  get: (path: string) => Promise<unknown>;
  page: (
    collection: string,
    after?: { id: string; sequence: number },
    since?: number,
  ) => Promise<Array<{ id: string; record: StoredRecord }>>;
  batch: (entries: Array<{ path: string; value: unknown }>) => Promise<void>;
  transaction: <T>(action: (tx: CloudTransaction) => Promise<T>) => Promise<T>;
  listen: (
    path: string,
    change: () => void,
    error: (error: unknown) => void,
  ) => () => void;
};
const HEADER = 'appState/records-v1';
const LEGACY = 'appState/main';
const recordId = (key: string) => {
  const id = encodeURIComponent(key);
  if (id.length > 1400)
    throw Error('Un identificador es demasiado largo para guardarlo.');
  return id;
};
const revision = () => new Date().toISOString();

export class CloudRepository {
  private records: StateRecords = new Map();
  private header: CloudHeader | null = null;
  private refreshQueue: Promise<AppState | null> = Promise.resolve(null);
  private database: RecordDatabase;
  constructor(database: RecordDatabase) {
    this.database = database;
  }

  private async readRecords(collection: string, since?: number) {
    const records: StoredRecord[] = [];
    let after: { id: string; sequence: number } | undefined;
    for (;;) {
      const page = await this.database.page(collection, after, since);
      if (!page.length) return records;
      records.push(...page.map((item) => item.record));
      const last = page.at(-1)!;
      after = { id: last.id, sequence: last.record.sequence };
    }
  }

  private async initializeSchema(): Promise<CloudHeader> {
    const existing = (await this.database.get(HEADER)) as CloudHeader | null;
    if (existing) {
      if (existing.schema !== 1)
        throw Error('Esta cuenta necesita una versión más reciente de la app.');
      return existing;
    }
    const legacy = await this.database.get(LEGACY);
    const source = canonical(legacy ?? null);
    const state = legacy ? migrateState(legacy) : defaultState;
    if (!state)
      throw Error(
        'La copia de Firebase no tiene un formato válido. No se ha modificado.',
      );
    const digest = [
      ...new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source)),
      ),
    ]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    // Each copier owns its staging collection. A slow second device must never
    // overwrite records that the first device has already activated and edited.
    const collection = `records-${digest.slice(0, 20)}-${crypto.randomUUID()}`;
    const entries = [...stateRecords(state)].map(([key, value]) => ({
      path: `${collection}/${recordId(key)}`,
      value: { key, value, deleted: false, sequence: 0 },
    }));
    for (let index = 0; index < entries.length; index += 200)
      await this.database.batch(entries.slice(index, index + 200));
    const verified = await this.readRecords(collection);
    const rebuilt = new Map(
      verified
        .filter((item) => !item.deleted)
        .map((item) => [item.key, item.value]),
    );
    if (
      verified.length !== entries.length ||
      !equal(
        [...rebuilt].sort(([a], [b]) => a.localeCompare(b)),
        [...stateRecords(state)].sort(([a], [b]) => a.localeCompare(b)),
      )
    )
      throw Error(
        'La comprobación de la copia no coincide. Firebase conserva el original.',
      );
    return this.database.transaction(async (tx) => {
      const current = (await tx.get(HEADER)) as CloudHeader | null;
      if (current) return current;
      const currentLegacy = await tx.get(LEGACY);
      if (canonical(currentLegacy ?? null) !== source)
        throw Error(
          'Los datos cambiaron durante la copia. Reintentaremos con la versión nueva.',
        );
      const header: CloudHeader = {
        schema: 1,
        collection,
        sequence: 0,
        updatedAt: state.updatedAt ?? revision(),
        source: digest,
        verifiedRecords: entries.length,
      };
      tx.set(HEADER, header);
      // The legacy document remains intact as a recovery copy. Only this pointer
      // makes the independently verified records authoritative for new clients.
      return header;
    });
  }

  load = (): Promise<AppState | null> => {
    const task = this.refreshQueue.catch(() => null).then(() => this.refresh());
    this.refreshQueue = task;
    return task;
  };

  private async refresh(): Promise<AppState> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const next = await this.initializeSchema();
      const reset = !this.header || this.header.collection !== next.collection;
      if (!reset && this.header?.sequence === next.sequence)
        return recordsState(this.records, next.updatedAt, next.sequence);
      const changes = await this.readRecords(
        next.collection,
        reset ? undefined : this.header!.sequence,
      );
      const confirmed = (await this.database.get(HEADER)) as CloudHeader;
      if (
        confirmed.collection !== next.collection ||
        confirmed.sequence !== next.sequence
      )
        continue;
      const records = reset ? new Map() : new Map(this.records);
      for (const change of changes) {
        if (change.deleted) records.delete(change.key);
        else records.set(change.key, change.value);
      }
      this.records = records;
      this.header = next;
      return recordsState(records, next.updatedAt, next.sequence);
    }
    throw Error(
      'La cuenta está recibiendo cambios. Reintenta la conexión en unos segundos.',
    );
  }

  save = async (
    state: AppState,
    _expected: string | null,
    base?: AppState,
  ): Promise<AppState> => {
    if (!this.header || !base)
      throw Error('Descarga Firebase antes de guardar.');
    const before = stateRecords(base);
    const local = stateRecords(state);
    const changed = [...new Set([...before.keys(), ...local.keys()])].filter(
      (key) => !equal(before.get(key), local.get(key)),
    );
    for (const key of changed) {
      recordId(key);
      if (new TextEncoder().encode(canonical(local.get(key))).length > 900000)
        throw Error(
          'Un registro es demasiado grande. Divide su contenido antes de guardar.',
        );
    }
    // Each chunk is idempotent: a retry accepts fields already equal to ours.
    for (let offset = 0; offset < changed.length; offset += 200) {
      const keys = changed.slice(offset, offset + 200);
      await this.database
        .transaction(async (tx) => {
          const header = (await tx.get(HEADER)) as CloudHeader;
          if (header.collection !== this.header!.collection)
            throw Error(
              'El formato remoto cambió. Reconecta antes de guardar.',
            );
          const rows = await Promise.all(
            keys.map(
              (key) =>
                tx.get(
                  `${header.collection}/${recordId(key)}`,
                ) as Promise<StoredRecord | null>,
            ),
          );
          const conflicts: Array<{
            path: string;
            local: unknown;
            remote: unknown;
          }> = [];
          const merged = keys.map((key, index) => {
            const row = rows[index];
            const remote = row?.deleted ? undefined : row?.value;
            return {
              key,
              value: mergeValue(
                before.get(key),
                local.get(key),
                remote,
                pathSegment(key),
                conflicts,
              ),
            };
          });
          if (conflicts.length)
            throw new CloudConflict(
              conflicts,
              recordsState(this.records, header.updatedAt),
            );
          const sequence = header.sequence + 1;
          for (const { key, value } of merged)
            tx.set(`${header.collection}/${recordId(key)}`, {
              key,
              ...(value !== undefined ? { value } : {}),
              deleted: value === undefined,
              sequence,
            });
          tx.set(HEADER, { ...header, sequence, updatedAt: revision() });
        })
        .catch(async (error) => {
          if (error instanceof CloudConflict)
            error.remote = (await this.load())!;
          throw error;
        });
    }
    return (await this.load())!;
  };

  subscribe = (
    change: (state: AppState) => void,
    error: (reason: unknown) => void,
  ) => {
    let active = true;
    const stop = this.database.listen(
      HEADER,
      () => {
        void this.load()
          .then((state) => {
            if (active && state) change(state);
          })
          .catch((reason) => {
            if (active) error(reason);
          });
      },
      (reason) => {
        if (active) error(reason);
      },
    );
    return () => {
      active = false;
      stop();
    };
  };
}
