import type { AppState } from './storage.ts';
import type { Exercise } from './workout-data.ts';
import { exerciseIdentity, sameExercise } from './exercise-identity.ts';
import { setLoad, workingSets } from './exercise-sets.ts';

export type HistoryExercise = Pick<Exercise, 'name' | 'id' | 'catalogId' | 'unit' | 'mode' | 'loadKind'>;
export function exerciseHistory(state: AppState, exercise: HistoryExercise, excludeWorkoutId?: string) {
  const active = new Set((state.activeWorkouts ?? []).filter(workout => !workout.finishedAt).map(workout => workout.id));
  return state.exerciseLogs.filter(log => sameExercise(log, exercise) && !log.skipped && (!excludeWorkoutId || log.workoutId !== excludeWorkoutId) && !active.has(log.workoutId ?? '') && (!log.unit || log.unit === (exercise.unit ?? 'kg')) && (log.mode ?? 'reps') === (exercise.mode ?? 'reps') && (log.loadKind ?? (log.unit === 'reps' ? 'none' : 'total')) === (exercise.loadKind ?? (exercise.unit === 'reps' ? 'none' : 'total')))
    .map(log => {
      const sets = workingSets(log.sets).filter(set => set.done);
      return { id: log.id, date: log.date, sets, load: log.loadKind === 'assistance' ? Math.min(...sets.map(set => setLoad(set, log))) : Math.max(0, ...sets.map(set => setLoad(set, log))), seconds: Math.max(0, ...sets.map(set => set.seconds ?? 0)), reps: Math.max(0, ...sets.map(set => set.reps)), totalReps: sets.reduce((sum, set) => sum + set.reps, 0), volume: sets.reduce((sum, set) => sum + setLoad(set, log) * set.reps, 0) * (log.loadKind === 'perHand' ? 2 : 1), original: log };
    }).filter(row => row.sets.length > 0 && Number.isFinite(Date.parse(row.date))).toSorted((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id));
}

export function loggedExercises(state: AppState) {
  const templates = state.sessions.flatMap(session => session.exercises);
  const entries = new Map<string, HistoryExercise>();
  for (const log of state.exerciseLogs.toSorted((a, b) => a.date.localeCompare(b.date))) {
    const candidates = templates.filter(exercise => sameExercise(log, exercise));
    const identities = new Set(candidates.map(exerciseIdentity));
    const template = identities.size === 1 ? candidates[0] : undefined;
    const exercise = { ...(template ?? { name: log.exercise, ...(log.exerciseId ? { id: log.exerciseId } : {}) }), unit: log.unit ?? template?.unit ?? 'kg', mode: log.mode ?? 'reps', loadKind: log.loadKind ?? (log.unit === 'reps' ? 'none' as const : 'total' as const) };
    if (log.sets.some(set => set.done && set.kind !== 'warmup') && !log.skipped) entries.set(exerciseIdentity(exercise), exercise);
  }
  return [...entries.values()].toSorted((a, b) => a.name.localeCompare(b.name, 'es-ES'));
}
