import type { AppState, DeletedRecords } from './storage.ts';

export function moveToTrash(
  state: AppState,
  kind: 'workoutLogs' | 'cardioLogs' | 'measurements',
  id: string,
  deletedAt = new Date().toISOString(),
): AppState {
  const record = state[kind].find((item) => item.id === id);
  if (!record) return state;
  const bundle: DeletedRecords = {
    id: `${kind}:${id}:${deletedAt}`,
    deletedAt,
    label:
      kind === 'workoutLogs'
        ? `Entrenamiento: ${'routineName' in record ? record.routineName : ''}`
        : kind === 'cardioLogs'
          ? `Actividad: ${'type' in record ? record.type : ''}`
          : 'Medida corporal',
    workoutLogs: [],
    exerciseLogs: [],
    cardioLogs: [],
    measurements: [],
  };
  if (kind === 'workoutLogs') {
    const workout = state.workoutLogs.find((item) => item.id === id)!;
    bundle.workoutLogs = [workout];
    const linked = new Set(
      workout.exercises.flatMap((item) => (item.logId ? [item.logId] : [])),
    );
    bundle.exerciseLogs = state.exerciseLogs.filter(
      (log) =>
        log.workoutId === id ||
        linked.has(log.id) ||
        (!log.workoutId &&
          log.routine === workout.routine &&
          log.week === workout.week &&
          new Date(log.date).toLocaleDateString('en-CA') ===
            new Date(workout.date).toLocaleDateString('en-CA')),
    );
  } else if (kind === 'cardioLogs')
    bundle.cardioLogs = state.cardioLogs.filter((item) => item.id === id);
  else
    bundle.measurements = state.measurements.filter((item) => item.id === id);
  const removed = new Set(bundle.exerciseLogs.map((log) => log.id));
  return {
    ...state,
    [kind]: state[kind].filter((item) => item.id !== id),
    exerciseLogs: state.exerciseLogs.filter((log) => !removed.has(log.id)),
    trash: [...(state.trash ?? []), bundle],
  };
}

const keys = [
  'workoutLogs',
  'exerciseLogs',
  'cardioLogs',
  'measurements',
] as const;
export function canRestore(state: AppState, bundle: DeletedRecords) {
  return keys.every(
    (key) =>
      !bundle[key].some((item) =>
        state[key].some((existing) => existing.id === item.id),
      ),
  );
}
export function restoreDeleted(state: AppState, id: string): AppState {
  const bundle = state.trash?.find((item) => item.id === id);
  if (!bundle || !canRestore(state, bundle)) return state;
  return {
    ...state,
    workoutLogs: [...state.workoutLogs, ...bundle.workoutLogs],
    exerciseLogs: [...state.exerciseLogs, ...bundle.exerciseLogs],
    cardioLogs: [...state.cardioLogs, ...bundle.cardioLogs],
    measurements: [...state.measurements, ...bundle.measurements],
    trash: state.trash?.filter((item) => item.id !== id),
  };
}
