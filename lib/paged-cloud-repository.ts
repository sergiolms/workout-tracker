import {
  CloudRepository,
  type CloudHeader,
  type RecordDatabase,
  type StoredRecord,
} from './cloud-repository.ts';
import {
  CloudConflict,
  equal,
  mergeValue,
  pathSegment,
  recordsState,
  stateRecords,
  type StateRecords,
} from './cloud-records.ts';
import {
  historyMonth,
  summarizeHistoryMonth,
  type HistoryMonthSummary,
} from './history-summary.ts';
import type { AppState } from './storage.ts';
import { sameExercise } from './exercise-identity.ts';

const HEADER = 'appState/records-v1';
const corePrefixes = [
  'setting:',
  'order:',
  'sessions:',
  'periods:',
  'activeWorkouts:',
  'summary:',
];
const historical = new Set([
  'workoutLogs',
  'exerciseLogs',
  'cardioLogs',
  'measurements',
  'trash',
  'mobilityDone',
  'warmupDone',
  'classes',
]);
const idFor = (key: string) => {
  const id = encodeURIComponent(key);
  if (id.length > 1400)
    throw Error('Un identificador es demasiado largo para guardarlo.');
  return id;
};
const recordDate = (key: string, value: unknown): string | undefined => {
  const kind = key.slice(0, key.indexOf(':'));
  if (!historical.has(kind)) return;
  if (
    value === undefined &&
    !['mobilityDone', 'warmupDone', 'classes'].includes(kind)
  )
    return;
  const raw =
    value && typeof value === 'object'
      ? ((value as { date?: string; deletedAt?: string }).date ??
        (value as { deletedAt?: string }).deletedAt)
      : /^\d{4}-\d{2}-\d{2}/.exec(key.slice(key.indexOf(':') + 1))?.[0];
  const date = raw ? new Date(raw) : null;
  return date && Number.isFinite(date.getTime())
    ? date.toISOString()
    : '0001-01-01T00:00:00.000Z';
};
const monthFor = (key: string, value: unknown) => {
  const date = recordDate(key, value);
  return date === undefined
    ? undefined
    : date.startsWith('0001-')
      ? 'undated'
      : date.slice(0, 7);
};
const monthBounds = (month: string) => {
  if (month === 'undated')
    return ['0001-01-01T00:00:00.000Z', '0002-01-01T00:00:00.000Z'];
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('Mes incorrecto.');
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return [start.toISOString(), end.toISOString()];
};
class RetryWrite extends Error {}

export class PagedCloudRepository {
  private records: StateRecords = new Map();
  private header: CloudHeader | null = null;
  private loaded = new Set<string>();
  private complete = false;
  private generation = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private database: RecordDatabase;
  constructor(database: RecordDatabase) {
    this.database = database;
    if (!database.prefixPage || !database.historyPage)
      throw Error('El adaptador no admite consultas de historial.');
  }
  private schedule<T>(action: () => Promise<T>): Promise<T> {
    const task = this.queue.catch(() => undefined).then(action);
    this.queue = task;
    return task;
  }
  private snapshot() {
    const summaries = [...this.records]
      .filter(([key]) => key.startsWith('summary:'))
      .map(([, value]) => value as HistoryMonthSummary);
    return recordsState(
      this.records,
      this.header?.updatedAt,
      this.header?.sequence,
      {
        complete: this.complete,
        generation: this.generation,
        loadedMonths: [...this.loaded],
        summaries,
      },
    );
  }
  private async prefix(collection: string, prefix: string) {
    const result: StoredRecord[] = [];
    let after: string | undefined;
    for (;;) {
      const page = await this.database.prefixPage!(collection, prefix, after);
      result.push(...page.map((row) => row.record));
      if (page.length < 100) return result;
      after = page.at(-1)!.id;
    }
  }
  private async month(collection: string, month: string) {
    const [start, end] = monthBounds(month);
    const result: StoredRecord[] = [];
    let after: { id: string; date: string } | undefined;
    for (;;) {
      const page = await this.database.historyPage!(
        collection,
        start,
        end,
        after,
      );
      result.push(...page.map((row) => row.record));
      if (page.length < 100) return result;
      const last = page.at(-1)!;
      after = { id: last.id, date: last.record.historyDate! };
    }
  }
  private apply(records: StateRecords, rows: StoredRecord[]) {
    for (const row of rows) {
      if (row.deleted) records.delete(row.key);
      else records.set(row.key, row.value);
    }
  }
  private async writeBatches(
    entries: Array<{ path: string; value: StoredRecord }>,
  ) {
    let batch: typeof entries = [],
      bytes = 0;
    for (const entry of entries) {
      const size = new TextEncoder().encode(JSON.stringify(entry)).length;
      if (size > 900000)
        throw Error(
          'Un registro supera el tamaño permitido. No se ha activado la actualización.',
        );
      if (batch.length && (batch.length >= 200 || bytes + size > 2_000_000)) {
        await this.database.batch(batch);
        batch = [];
        bytes = 0;
      }
      batch.push(entry);
      bytes += size;
    }
    if (batch.length) await this.database.batch(batch);
  }
  private async ensureSchema(): Promise<CloudHeader> {
    const current = (await this.database.get(HEADER)) as CloudHeader | null;
    if (current?.schema === 2) return current;
    if (current && current.schema !== 1)
      throw Error('Actualiza la app para abrir esta cuenta.');
    const full = (await new CloudRepository(this.database).load())!;
    const before = (await this.database.get(HEADER)) as CloudHeader;
    if (before.schema === 2) return before;
    if (before.sequence !== full.cloudRevision)
      throw Error(
        'La cuenta cambió durante la preparación. Reintenta la conexión.',
      );
    const originals = stateRecords(full);
    const records = new Map(originals);
    const months = new Set(
      [...originals]
        .map(([key, value]) => monthFor(key, value))
        .filter((month): month is string => Boolean(month)),
    );
    for (const month of months)
      records.set(`summary:${month}`, summarizeHistoryMonth(full, month));
    const collection = `history-${crypto.randomUUID()}`;
    await this.writeBatches(
      [...records].map(([key, value]) => ({
        path: `${collection}/${idFor(key)}`,
        value: {
          key,
          value,
          deleted: false,
          sequence: 0,
          ...(recordDate(key, value)
            ? { historyDate: recordDate(key, value) }
            : {}),
        },
      })),
    );
    const verified: StateRecords = new Map();
    let after: { id: string; sequence: number } | undefined;
    for (;;) {
      const page = await this.database.page(collection, after);
      if (
        page.some(
          (row) =>
            row.id !== idFor(row.record.key) ||
            row.record.deleted ||
            row.record.historyDate !==
              recordDate(row.record.key, row.record.value),
        )
      )
        throw Error(
          'La comprobación de fechas no coincide. Los registros originales siguen activos.',
        );
      this.apply(
        verified,
        page.map((row) => row.record),
      );
      if (page.length < 100) break;
      const last = page.at(-1)!;
      after = { id: last.id, sequence: last.record.sequence };
    }
    if (
      verified.size !== records.size ||
      [...records].some(([key, value]) => !equal(value, verified.get(key)))
    )
      throw Error(
        'La copia no coincide. Los registros originales siguen activos.',
      );
    return this.database.transaction(async (tx) => {
      const latest = (await tx.get(HEADER)) as CloudHeader;
      if (latest.schema === 2) return latest;
      if (
        latest.collection !== before.collection ||
        latest.sequence !== before.sequence
      )
        throw Error(
          'La cuenta cambió durante la comprobación. Los registros originales siguen activos.',
        );
      const next: CloudHeader = {
        ...latest,
        schema: 2,
        collection,
        sequence: 0,
        verifiedRecords: originals.size,
        updatedAt: new Date().toISOString(),
      };
      tx.set(HEADER, next);
      return next;
    });
  }
  load = () => this.schedule(() => this.refresh());
  private async refresh(): Promise<AppState> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const next = await this.ensureSchema();
      const reset = next.collection !== this.header?.collection;
      if (!reset && next.sequence === this.header?.sequence)
        return this.snapshot();
      const records = reset ? new Map() : new Map(this.records);
      if (reset) {
        for (const prefix of corePrefixes)
          this.apply(records, await this.prefix(next.collection, prefix));
        this.loaded.clear();
        this.complete = false;
        const core = recordsState(records, next.updatedAt, next.sequence, {
          complete: false,
          generation: 0,
          summaries: [],
          loadedMonths: [],
        });
        const months = new Set([
          historyMonth(new Date().toISOString()),
          ...(core.activeWorkouts ?? []).map((log) => historyMonth(log.date)),
        ]);
        for (const month of months) {
          this.apply(records, await this.month(next.collection, month));
          this.loaded.add(month);
        }
      } else {
        let after: { id: string; sequence: number } | undefined;
        for (;;) {
          const page = await this.database.page(
            next.collection,
            after,
            this.header!.sequence,
          );
          this.apply(
            records,
            page
              .map((row) => row.record)
              .filter(
                (row) =>
                  this.complete ||
                  records.has(row.key) ||
                  corePrefixes.some((prefix) => row.key.startsWith(prefix)) ||
                  this.loaded.has(monthFor(row.key, row.value) ?? ''),
              ),
          );
          if (page.length < 100) break;
          const last = page.at(-1)!;
          after = { id: last.id, sequence: last.record.sequence };
        }
      }
      const confirmed = (await this.database.get(HEADER)) as CloudHeader;
      if (
        confirmed.collection !== next.collection ||
        confirmed.sequence !== next.sequence
      )
        continue;
      this.records = records;
      this.header = next;
      this.generation++;
      await this.loadPreviousExercises();
      return this.snapshot();
    }
    throw Error(
      'La cuenta está recibiendo cambios. Reintenta en unos segundos.',
    );
  }
  private async loadPreviousExercises() {
    const state = this.snapshot();
    const templates = state.sessions.flatMap((session) => session.exercises);
    const candidates = state.history!.summaries.flatMap((summary) =>
      Object.values(summary.exercises),
    );
    const ids = new Set<string>(
      state.workoutLogs.flatMap((workout) =>
        workout.exercises.flatMap((exercise) =>
          exercise.logId && !this.records.has(`exerciseLogs:${exercise.logId}`)
            ? [exercise.logId]
            : [],
        ),
      ),
    );
    for (const exercise of templates) {
      const reference = candidates
        .filter(
          (item) =>
            sameExercise(
              { exercise: item.name, exerciseId: item.id },
              exercise,
            ) &&
            (item.mode ?? 'reps') === (exercise.mode ?? 'reps') &&
            (item.loadKind ?? (item.unit === 'reps' ? 'none' : 'total')) ===
              (exercise.loadKind ??
                (exercise.unit === 'reps' ? 'none' : 'total')),
        )
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (reference && !this.records.has(`exerciseLogs:${reference.logId}`))
        ids.add(reference.logId);
    }
    const pending = [...ids];
    for (let offset = 0; offset < pending.length; offset += 10) {
      const rows = await Promise.all(
        pending
          .slice(offset, offset + 10)
          .map(
            async (id) =>
              (await this.database.get(
                `${this.header!.collection}/${idFor(`exerciseLogs:${id}`)}`,
              )) as StoredRecord | null,
          ),
      );
      this.apply(
        this.records,
        rows.filter((row): row is StoredRecord => row !== null),
      );
    }
  }
  loadMonth = (month: string) =>
    this.schedule(async () => {
      await this.refresh();
      if (this.complete || this.loaded.has(month)) return this.snapshot();
      for (let attempt = 0; attempt < 5; attempt++) {
        await this.refresh();
        const header = this.header!;
        const rows = await this.month(header.collection, month);
        const confirmed = (await this.database.get(HEADER)) as CloudHeader;
        if (
          confirmed.sequence !== header.sequence ||
          confirmed.collection !== header.collection
        ) {
          await this.refresh();
          continue;
        }
        this.apply(this.records, rows);
        this.loaded.add(month);
        this.generation++;
        await this.loadPreviousExercises();
        return this.snapshot();
      }
      throw Error('No se pudo cargar este mes. Reintenta.');
    });
  loadAll = () =>
    this.schedule(async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const header = await this.ensureSchema();
        const records: StateRecords = new Map();
        let after: { id: string; sequence: number } | undefined;
        for (;;) {
          const page = await this.database.page(header.collection, after);
          this.apply(
            records,
            page.map((row) => row.record),
          );
          if (page.length < 100) break;
          const last = page.at(-1)!;
          after = { id: last.id, sequence: last.record.sequence };
        }
        const confirmed = (await this.database.get(HEADER)) as CloudHeader;
        if (
          confirmed.collection !== header.collection ||
          confirmed.sequence !== header.sequence
        )
          continue;
        this.records = records;
        this.header = header;
        this.complete = true;
        this.generation++;
        return this.snapshot();
      }
      throw Error(
        'La cuenta cambió durante la descarga. Reintenta para obtener una copia completa.',
      );
    });
  save = async (state: AppState, _expected: string | null, base?: AppState) => {
    if (!this.header || !base)
      throw Error('Conecta con Firebase antes de guardar.');
    const before = stateRecords(base),
      local = stateRecords(state);
    const changed = [...new Set([...before.keys(), ...local.keys()])].filter(
      (key) => !equal(before.get(key), local.get(key)),
    );
    let batch: string[] = [],
      size = 0;
    for (const key of changed) {
      const bytes =
        new TextEncoder().encode(
          JSON.stringify([before.get(key), local.get(key)]),
        ).length + 2000;
      if (bytes > 1_800_000)
        throw Error('Un registro es demasiado grande para guardarlo.');
      if (batch.length && (batch.length >= 100 || size + bytes > 1_800_000)) {
        const chunk = batch;
        await this.schedule(() => this.saveChunk(chunk, before, local));
        batch = [];
        size = 0;
      }
      batch.push(key);
      size += bytes;
    }
    if (batch.length)
      await this.schedule(() => this.saveChunk(batch, before, local));
    return this.load();
  };
  private async saveChunk(
    keys: string[],
    before: StateRecords,
    local: StateRecords,
  ) {
    for (let attempt = 0; attempt < 5; attempt++) {
      await this.refresh();
      const header = (await this.database.get(HEADER)) as CloudHeader;
      if (header.collection !== this.header!.collection)
        throw Error('El formato remoto cambió. Reconecta.');
      const rows = await Promise.all(
        keys.map(
          (key) =>
            this.database.get(
              `${header.collection}/${idFor(key)}`,
            ) as Promise<StoredRecord | null>,
        ),
      );
      const months = new Set<string>();
      const conflicts: CloudConflict['conflicts'] = [];
      const next = keys.map((key, index) => {
        const remote = rows[index]?.deleted ? undefined : rows[index]?.value;
        const value = mergeValue(
          before.get(key),
          local.get(key),
          remote,
          pathSegment(key),
          conflicts,
        );
        for (const candidate of [remote, value]) {
          const month = monthFor(key, candidate);
          if (month) months.add(month);
          if (
            key.startsWith('activeWorkouts:') &&
            candidate &&
            typeof candidate === 'object' &&
            'date' in candidate
          ) {
            const date = new Date(String(candidate.date));
            date.setUTCDate(1);
            date.setUTCHours(0, 0, 0, 0);
            const now = new Date();
            for (
              let count = 0;
              Number.isFinite(date.getTime()) && date <= now && count < 1200;
              count++
            ) {
              months.add(historyMonth(date.toISOString()));
              date.setUTCMonth(date.getUTCMonth() + 1);
            }
          }
        }
        return { key, value, old: remote };
      });
      const records = new Map(this.records);
      for (const month of months) {
        for (const [key, value] of records)
          if (monthFor(key, value) === month) records.delete(key);
        this.apply(records, await this.month(header.collection, month));
      }
      if (conflicts.length)
        throw new CloudConflict(
          conflicts,
          recordsState(
            records,
            header.updatedAt,
            header.sequence,
            this.snapshot().history,
          ),
        );
      for (const { key, value } of next) {
        if (value === undefined) records.delete(key);
        else records.set(key, value);
      }
      const completeMonths = recordsState(
        records,
        header.updatedAt,
        header.sequence,
        this.snapshot().history,
      );
      const summaries = [...months].map((month) => ({
        key: `summary:${month}`,
        value: summarizeHistoryMonth(completeMonths, month),
      }));
      try {
        await this.database.transaction(async (tx) => {
          const latest = (await tx.get(HEADER)) as CloudHeader;
          if (
            latest.collection !== header.collection ||
            latest.sequence !== header.sequence
          )
            throw new RetryWrite();
          const sequence = latest.sequence + 1;
          for (const item of [...next, ...summaries]) {
            const date = recordDate(
              item.key,
              item.value ?? ('old' in item ? item.old : undefined),
            );
            const row: StoredRecord = {
              key: item.key,
              deleted: item.value === undefined,
              sequence,
              ...(item.value !== undefined ? { value: item.value } : {}),
              ...(date ? { historyDate: date } : {}),
            };
            if (new TextEncoder().encode(JSON.stringify(row)).length > 900000)
              throw Error(
                'Un registro es demasiado grande. Divide su contenido.',
              );
            tx.set(`${header.collection}/${idFor(item.key)}`, row);
          }
          tx.set(HEADER, {
            ...latest,
            sequence,
            updatedAt: new Date().toISOString(),
          });
        });
        this.records = records;
        for (const summary of summaries)
          this.records.set(summary.key, summary.value);
        for (const month of months) this.loaded.add(month);
        this.generation++;
        return;
      } catch (error) {
        if (!(error instanceof RetryWrite)) throw error;
      }
    }
    throw Error(
      'Otros dispositivos están guardando cambios. Reintenta en unos segundos.',
    );
  }
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
            if (active) change(state);
          })
          .catch((reason) => {
            if (active) error(reason);
          });
      },
      error,
    );
    return () => {
      active = false;
      stop();
    };
  };
}
