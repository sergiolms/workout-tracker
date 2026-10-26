import { defaultState, migrateState, type AppState } from './storage.ts';
import { equal } from './cloud-records.ts';

const historyKeys = [
  'workoutLogs',
  'exerciseLogs',
  'cardioLogs',
  'measurements',
  'trash',
] as const;
const fail = (message: string): never => {
  throw Error(`Copia no válida: ${message}`);
};
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown, min = 0, max = 1e7) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
const date = (value: unknown) => {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    return false;
  const day = value.slice(0, 10);
  const normalized = new Date(`${day}T12:00:00Z`);
  return (
    Number.isFinite(normalized.getTime()) &&
    normalized.toISOString().slice(0, 10) === day
  );
};
const string = (value: unknown) =>
  typeof value === 'string' && value.length <= 10000;

function validateExerciseMetadata(value: Record<string, unknown>) {
  if (
    value.progression !== undefined &&
    value.progression !== 'off' &&
    value.progression !== 'double'
  )
    fail('política de progresión incorrecta.');
  if (
    value.mode !== undefined &&
    (typeof value.mode !== 'string' || !['reps', 'time'].includes(value.mode))
  )
    fail('modalidad de ejercicio incorrecta.');
  if (
    value.loadKind !== undefined &&
    (typeof value.loadKind !== 'string' ||
      !['total', 'perHand', 'added', 'assistance', 'none'].includes(
        value.loadKind,
      ))
  )
    fail('criterio de carga incorrecto.');
  if (
    value.targetSeconds !== undefined &&
    !number(value.targetSeconds, 1, 86400)
  )
    fail('tiempo objetivo incorrecto.');
  for (const key of ['exerciseId', 'unit', 'catalogId', 'id']) {
    const field = value[key];
    if (
      field !== undefined &&
      (typeof field !== 'string' || field.length > 500)
    )
      fail('identidad de ejercicio incorrecta.');
  }
  if (
    value.image !== undefined &&
    (typeof value.image !== 'string' ||
      (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|webp|png)$/.test(value.image) &&
        !/^data:image\/(webp|jpeg|png);base64,[a-zA-Z0-9+/=]+$/.test(
          value.image,
        )))
  )
    fail('imagen de ejercicio incorrecta.');
}

export function parseBackup(text: string): AppState {
  if (text.length > 20_000_000) fail('el archivo supera 20 MB.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('el archivo no es JSON.');
  }
  if (
    !record(raw) ||
    ![1, 2, 3].includes(Number(raw.version)) ||
    !Array.isArray(raw.sessions) ||
    !Array.isArray(raw.exerciseLogs)
  )
    fail('se esperaba una copia exportada desde Zero to Hero.');
  const source = raw as Record<string, unknown>;
  if (
    source.week !== undefined &&
    (!number(source.week, 1, 10000) || !Number.isInteger(source.week))
  )
    fail('semana actual incorrecta.');
  const scan = (value: unknown, depth = 0) => {
    if (depth > 15) fail('estructura demasiado profunda.');
    if (value && typeof value === 'object')
      for (const [key, child] of Object.entries(value)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key))
          fail('campo no permitido.');
        scan(child, depth + 1);
      }
  };
  scan(raw);
  for (const key of ['sessions', 'periods', ...historyKeys] as const) {
    const entries = source[key] ?? [];
    if (!Array.isArray(entries) || entries.length > 100000)
      fail(`lista ${key} incorrecta.`);
    const ids = new Set<string>();
    for (const row of entries as unknown[]) {
      if (
        !record(row) ||
        typeof row.id !== 'string' ||
        !row.id ||
        row.id.length > 500 ||
        ids.has(row.id)
      )
        fail(`identificadores incorrectos o repetidos en ${key}.`);
      const item = row as Record<string, unknown>;
      ids.add(item.id as string);
      if (
        new TextEncoder().encode(JSON.stringify(item)).length > 900000 ||
        encodeURIComponent(`${key}:${item.id as string}`).length > 1400
      )
        fail('un registro supera el tamaño permitido.');
      if (
        historyKeys.includes(key as (typeof historyKeys)[number]) &&
        !date(key === 'trash' ? item.deletedAt : item.date)
      )
        fail(`fecha incorrecta en ${key}.`);
      if (key === 'trash') {
        if (!string(item.label)) fail('registro eliminado incorrecto.');
        for (const field of [
          'workoutLogs',
          'exerciseLogs',
          'cardioLogs',
          'measurements',
        ])
          if (!Array.isArray(item[field]))
            fail('contenido de papelera incorrecto.');
        parseBackup(
          JSON.stringify({
            ...defaultState,
            workoutLogs: item.workoutLogs,
            exerciseLogs: item.exerciseLogs,
            cardioLogs: item.cardioLogs,
            measurements: item.measurements,
          }),
        );
      }
      if (key === 'sessions') {
        if (
          !string(item.name) ||
          !Array.isArray(item.exercises) ||
          item.exercises.length > 500
        )
          fail('rutina incorrecta.');
        for (const exercise of item.exercises as unknown[]) {
          if (
            !record(exercise) ||
            !string(exercise.name) ||
            !string(exercise.target) ||
            !number(exercise.sets, 1, 100) ||
            !number(exercise.minReps) ||
            !number(exercise.maxReps) ||
            !number(exercise.increment, 0.001)
          )
            fail('objetivo de ejercicio incorrecto.');
          validateExerciseMetadata(exercise as Record<string, unknown>);
        }
      }
      if (
        key === 'periods' &&
        (!string(item.name) ||
          !number(item.durationWeeks, 1, 52) ||
          !Array.isArray(item.routines) ||
          !item.routines.every(string))
      )
        fail('tramo incorrecto.');
      if (key === 'exerciseLogs') {
        validateExerciseMetadata(item);
        if (
          !string(item.exercise) ||
          !string(item.routine) ||
          !number(item.week, 1, 10000) ||
          !number(item.load) ||
          !number(item.rir, 0, 10) ||
          !number(item.pain, 0, 10) ||
          !string(item.note) ||
          !Array.isArray(item.sets) ||
          item.sets.length > 1000
        )
          fail('registro de ejercicio incorrecto.');
        for (const set of item.sets as unknown[])
          if (
            !record(set) ||
            !number(set.reps) ||
            !Number.isInteger(set.reps) ||
            typeof set.done !== 'boolean' ||
            (set.load !== undefined && !number(set.load)) ||
            (set.seconds !== undefined && !number(set.seconds, 0, 86400)) ||
            (set.distanceKm !== undefined && !number(set.distanceKm)) ||
            (set.rpe !== undefined && !number(set.rpe, 0, 10)) ||
            (set.sourceType !== undefined && !string(set.sourceType)) ||
            (set.supersetId !== undefined && !string(set.supersetId)) ||
            (set.kind !== undefined &&
              set.kind !== 'work' &&
              set.kind !== 'warmup')
          )
            fail('serie incorrecta.');
      }
      if (
        key === 'workoutLogs' &&
        (!string(item.routine) ||
          !string(item.routineName) ||
          !number(item.week, 1, 10000) ||
          !string(item.notes) ||
          !Array.isArray(item.exercises) ||
          !item.exercises.every(
            (exercise) =>
              record(exercise) &&
              string(exercise.name) &&
              ['done', 'partial', 'skipped', 'pending'].includes(
                String(exercise.status),
              ),
          ))
      )
        fail('entrenamiento incorrecto.');
      if (
        key === 'cardioLogs' &&
        (!string(item.type) || !number(item.minutes, 1))
      )
        fail('actividad incorrecta.');
      if (key === 'cardioLogs')
        for (const field of [
          'steps',
          'distance',
          'rpe',
          'heartRate',
          'stepLengthCm',
        ])
          if (item[field] !== undefined && !number(item[field]))
            fail(`valor ${field} incorrecto.`);
      if (key === 'measurements')
        for (const field of [
          'weight',
          'waist',
          'restingHr',
          'sleep',
          'energy',
          'pain',
        ])
          if (item[field] !== undefined && !number(item[field]))
            fail(`medida ${field} incorrecta.`);
    }
  }
  if (
    source.plan !== undefined &&
    (!Array.isArray(source.plan) ||
      !source.plan.every(
        (week) =>
          record(week) &&
          number(week.week, 1) &&
          string(week.block) &&
          Array.isArray(week.routines) &&
          week.routines.every(string),
      ))
  )
    fail('estructura semanal incorrecta.');
  const state = migrateState(raw);
  if (!state) return fail('no se pudo leer el contenido.');
  const active = new Set(
    (state.activeWorkouts ?? []).map((workout) => workout.id),
  );
  return {
    ...state,
    activeWorkouts: [],
    exerciseLogs: state.exerciseLogs.filter(
      (log) => !log.workoutId || !active.has(log.workoutId),
    ),
  };
}

export function backupPreview(current: AppState, incoming: AppState) {
  return historyKeys.map((key) => {
    const existing = new Map(
      (current[key] ?? []).map((item) => [item.id, item]),
    );
    const additions = (incoming[key] ?? []).filter(
      (item) => !existing.has(item.id),
    ).length;
    const conflicts = (incoming[key] ?? []).filter(
      (item) => existing.has(item.id) && !equal(existing.get(item.id), item),
    ).length;
    return {
      key,
      additions,
      conflicts,
      duplicates: (incoming[key] ?? []).length - additions - conflicts,
    };
  });
}

export function importBackup(
  current: AppState,
  incoming: AppState,
  options: { includePlan: boolean; replaceConflicts: boolean },
): AppState {
  const result = { ...current };
  for (const key of historyKeys) {
    const merged = new Map<string, unknown>(
      (current[key] ?? []).map((item) => [item.id, item]),
    );
    for (const item of incoming[key] ?? [])
      if (!merged.has(item.id) || options.replaceConflicts)
        merged.set(item.id, item);
    Object.assign(result, { [key]: [...merged.values()] });
  }
  if (options.includePlan)
    Object.assign(result, {
      sessions: incoming.sessions,
      periods: incoming.periods,
      plan: incoming.plan,
      planName: incoming.planName || defaultState.planName,
      week: Math.max(1, Math.min(current.week, incoming.plan.length || 1)),
    });
  return result;
}
