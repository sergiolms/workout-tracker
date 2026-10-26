import type { AppState, ExerciseLog } from './storage.ts';
import { workingSets } from './exercise-sets.ts';

export function weekInterval(date: Date, offset = 0) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7 + offset * 7);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return { start, end };
}
export function weeklyVolume(state: AppState, start: number, end: number, group: (log: ExerciseLog) => string) {
  const active = new Set((state.activeWorkouts ?? []).filter(workout => !workout.finishedAt).map(workout => workout.id));
  const groups = new Map<string, number>();
  const exercises = new Map<string, { name: string; sets: number }>();
  let total = 0;
  for (const log of state.exerciseLogs) {
    const at = Date.parse(log.date);
    if (log.skipped || active.has(log.workoutId ?? '') || at < start || at >= end || !Number.isFinite(at)) continue;
    const count = workingSets(log.sets).filter(set => set.done).length;
    if (!count) continue;
    total += count;
    const label = group(log);
    groups.set(label, (groups.get(label) ?? 0) + count);
    const key = log.exerciseId ?? log.exercise;
    const previous = exercises.get(key);
    exercises.set(key, { name: log.exercise, sets: (previous?.sets ?? 0) + count });
  }
  return { total, groups: [...groups].toSorted((a, b) => b[1] - a[1]), exercises: [...exercises.values()].toSorted((a, b) => b.sets - a.sets || a.name.localeCompare(b.name, 'es')) };
}

export function estimatedOneRepMax(log: ExerciseLog): number | null {
  if (log.mode === 'time' || log.unit === 'reps' || (log.loadKind && log.loadKind !== 'total') || log.skipped) return null;
  const estimates = workingSets(log.sets).filter(set => set.done && set.reps >= 1 && set.reps <= 10 && (set.load ?? log.load) > 0).map(set => (set.load ?? log.load) * (1 + set.reps / 30));
  return estimates.length ? Math.max(...estimates) : null;
}
