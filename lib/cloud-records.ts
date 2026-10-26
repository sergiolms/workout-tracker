import {
  defaultState,
  migrateState,
  weeksFromPeriods,
  type AppState,
} from './storage.ts';
import type { HistoryCoverage } from './history-summary.ts';

export type RecordValue = unknown;
export type StateRecords = Map<string, RecordValue>;
export type FieldConflict = { path: string; local: unknown; remote: unknown };
export class CloudConflict extends Error {
  conflicts: FieldConflict[];
  remote: AppState;
  constructor(conflicts: FieldConflict[], remote: AppState) {
    super(
      'Otro dispositivo ha modificado los mismos datos. Elige qué versión conservar.',
    );
    this.name = 'CloudConflict';
    this.conflicts = conflicts;
    this.remote = remote;
  }
}

const collections = [
  'sessions',
  'periods',
  'workoutLogs',
  'exerciseLogs',
  'cardioLogs',
  'measurements',
  'activeWorkouts',
  'trash',
] as const;
const memberships = ['mobilityDone', 'warmupDone', 'classes'] as const;
const settings = [
  'week',
  'planName',
  'theme',
  'haptics',
  'workoutView',
  'rotation',
  'restEnabled',
  'restSeconds',
] as const;
export const canonical = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
};
export const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b);
export const pathSegment = (value: string) =>
  value.replace(/~/g, '~0').replace(/\//g, '~1');

export function stateRecords(state: AppState): StateRecords {
  const records: StateRecords = new Map();
  for (const key of settings)
    if (state[key] !== undefined) records.set(`setting:${key}`, state[key]);
  for (const key of collections)
    for (const item of state[key] ?? []) records.set(`${key}:${item.id}`, item);
  for (const key of memberships)
    for (const item of state[key]) records.set(`${key}:${item}`, true);
  // Ordering lives separately so editing one routine never rewrites its siblings.
  for (const key of ['sessions', 'periods'] as const)
    records.set(
      `order:${key}`,
      state[key].map((item) => item.id),
    );
  return records;
}

export function recordsState(
  records: StateRecords,
  updatedAt?: string,
  cloudRevision?: number,
  history?: HistoryCoverage,
): AppState {
  const state: AppState = {
    ...defaultState,
    sessions: [],
    periods: [],
    workoutLogs: [],
    exerciseLogs: [],
    cardioLogs: [],
    measurements: [],
    activeWorkouts: [],
    trash: [],
    mobilityDone: [],
    warmupDone: [],
    classes: [],
    updatedAt,
    ...(history ? { history } : {}),
  };
  for (const [key, value] of records) {
    const colon = key.indexOf(':');
    const kind = key.slice(0, colon);
    const id = key.slice(colon + 1);
    if (
      kind === 'setting' &&
      settings.includes(id as (typeof settings)[number])
    )
      Object.assign(state, { [id]: value });
    else if (collections.includes(kind as (typeof collections)[number]))
      (state[kind as (typeof collections)[number]] as unknown[]).push(value);
    else if (
      memberships.includes(kind as (typeof memberships)[number]) &&
      value === true
    )
      state[kind as (typeof memberships)[number]].push(id);
  }
  for (const key of ['sessions', 'periods'] as const) {
    const order = records.get(`order:${key}`) as string[] | undefined;
    if (order)
      state[key].sort(
        (a, b) =>
          (order.indexOf(a.id) < 0 ? Infinity : order.indexOf(a.id)) -
          (order.indexOf(b.id) < 0 ? Infinity : order.indexOf(b.id)),
      );
  }
  if (cloudRevision !== undefined) state.cloudRevision = cloudRevision;
  state.plan = weeksFromPeriods(state.periods);
  return migrateState(state) ?? state;
}

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export function mergeValue(
  base: unknown,
  local: unknown,
  remote: unknown,
  path: string,
  conflicts: FieldConflict[],
  choices: Record<string, 'local' | 'remote'> = {},
): unknown {
  if (choices[path]) return choices[path] === 'local' ? local : remote;
  if (equal(local, base)) return remote;
  if (equal(remote, base) || equal(local, remote)) return local;
  if (object(base) && object(local) && object(remote)) {
    const result: Record<string, unknown> = {};
    for (const key of new Set([
      ...Object.keys(base),
      ...Object.keys(local),
      ...Object.keys(remote),
    ])) {
      const value = mergeValue(
        base[key],
        local[key],
        remote[key],
        `${path}/${pathSegment(key)}`,
        conflicts,
        choices,
      );
      if (value !== undefined) result[key] = value;
    }
    return result;
  }
  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    const arrays = [base, local, remote];
    if (
      arrays.every((items) =>
        items.every((item) => typeof item === 'string'),
      ) &&
      arrays.every((items) => new Set(items).size === items.length) &&
      base.every(
        (item, index) => local[index] === item && remote[index] === item,
      )
    ) {
      return [
        ...base,
        ...new Set([...local.slice(base.length), ...remote.slice(base.length)]),
      ].filter((item, index, items) => items.indexOf(item) === index);
    }
    const identity = (item: unknown) =>
      !object(item)
        ? undefined
        : typeof item.id === 'string'
          ? item.id
          : typeof item.name === 'string'
            ? item.name
            : undefined;
    if (
      arrays.every(
        (items) =>
          items.every((item) => identity(item) !== undefined) &&
          new Set(items.map(identity)).size === items.length,
      )
    ) {
      const maps = arrays.map(
        (items) => new Map(items.map((item) => [identity(item), item])),
      );
      const merged = new Map();
      for (const key of new Set([
        ...maps[0].keys(),
        ...maps[1].keys(),
        ...maps[2].keys(),
      ])) {
        const value = mergeValue(
          maps[0].get(key),
          maps[1].get(key),
          maps[2].get(key),
          `${path}/${pathSegment(key!)}`,
          conflicts,
          choices,
        );
        if (value !== undefined) merged.set(key, value);
      }
      const order = mergeValue(
        base.map(identity),
        local.map(identity),
        remote.map(identity),
        `${path}/order`,
        conflicts,
        choices,
      ) as string[];
      return [...new Set([...order, ...merged.keys()])]
        .filter((key) => merged.has(key))
        .map((key) => merged.get(key));
    }
  }
  // Independent changes to two existing series can merge; adding/removing rows
  // concurrently needs a decision because positional identities may have moved.
  if (
    Array.isArray(base) &&
    Array.isArray(local) &&
    Array.isArray(remote) &&
    base.length === local.length &&
    base.length === remote.length &&
    base.every(object) &&
    !path.startsWith('order:')
  ) {
    const identity = (item: Record<string, unknown>) => item.id ?? item.name;
    if (
      base.every(
        (item, index) =>
          identity(item) === identity(local[index]) &&
          identity(item) === identity(remote[index]),
      )
    )
      return base.map((item, index) =>
        mergeValue(
          item,
          local[index],
          remote[index],
          `${path}/${index}`,
          conflicts,
          choices,
        ),
      );
  }
  conflicts.push({ path, local, remote });
  return local;
}

export function mergeStates(
  base: AppState,
  local: AppState,
  remote: AppState,
  choices: Record<string, 'local' | 'remote'> = {},
) {
  const before = stateRecords(base);
  const mine = stateRecords(local);
  const theirs = stateRecords(remote);
  const merged: StateRecords = new Map();
  const conflicts: FieldConflict[] = [];
  for (const key of new Set([
    ...before.keys(),
    ...mine.keys(),
    ...theirs.keys(),
  ])) {
    const value = mergeValue(
      before.get(key),
      mine.get(key),
      theirs.get(key),
      pathSegment(key),
      conflicts,
      choices,
    );
    if (value !== undefined) merged.set(key, value);
  }
  return {
    state: recordsState(
      merged,
      local.updatedAt,
      remote.cloudRevision,
      remote.history ?? local.history,
    ),
    conflicts,
  };
}
