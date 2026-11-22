import type { ActiveWorkout, AppState } from './storage.ts';

export function currentWorkout(state: AppState) {
  return [...(state.activeWorkouts ?? [])]
    .filter((w) => !w.finishedAt)
    .sort(
      (a, b) =>
        b.startedAt.localeCompare(a.startedAt) || a.id.localeCompare(b.id),
    )[0];
}
export function workoutSeconds(workout: ActiveWorkout, now = Date.now()) {
  return Math.max(
    0,
    Math.floor(
      ((workout.pausedAt ? Date.parse(workout.pausedAt) : now) -
        Date.parse(workout.startedAt) -
        (workout.pausedMs ?? 0)) /
        1000,
    ),
  );
}
export function formatWorkoutTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
export function toggleWorkoutPause(
  state: AppState,
  id: string,
  now = new Date().toISOString(),
): AppState {
  return {
    ...state,
    activeWorkouts: (state.activeWorkouts ?? []).map((w) => {
      if (w.id !== id || w.finishedAt) return w;
      if (!w.pausedAt) return { ...w, pausedAt: now };
      const { pausedAt, ...rest } = w;
      return {
        ...rest,
        pausedMs:
          (w.pausedMs ?? 0) +
          Math.max(0, Date.parse(now) - Date.parse(pausedAt)),
      };
    }),
  };
}
