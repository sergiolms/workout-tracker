import type { AppState, WorkoutLog } from './storage.ts';
import { countsTowardPlan } from './plan-progress.ts';

export function rotationRoutines(state: AppState): string[] {
  const available = new Set(state.sessions.map((session) => session.id));
  return [...new Set(state.rotation?.routines ?? [])].filter((id) =>
    available.has(id),
  );
}
export function nextRotationRoutine(
  state: AppState,
  logs: WorkoutLog[] = state.workoutLogs,
): string | null {
  const ids = rotationRoutines(state);
  if (!ids.length || !state.rotation) return null;
  const latest = logs
    .filter(
      (log) =>
        log.rotationId === state.rotation?.id &&
        ids.includes(log.routine) &&
        log.date >= state.rotation!.startedAt &&
        countsTowardPlan(log),
    )
    .toSorted(
      (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    )[0];
  return ids[latest ? (ids.indexOf(latest.routine) + 1) % ids.length : 0];
}
