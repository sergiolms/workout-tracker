import type { ActiveWorkout, AppState } from './storage.ts';

export function activeWorkout(
  state: AppState,
  week: number,
  routine: string,
): ActiveWorkout | undefined {
  return (state.activeWorkouts ?? [])
    .filter(
      (item) =>
        item.week === week && item.routine === routine && !item.finishedAt,
    )
    .sort(
      (a, b) =>
        b.startedAt.localeCompare(a.startedAt) || a.id.localeCompare(b.id),
    )[0];
}

export function startWorkout(
  state: AppState,
  workout: ActiveWorkout,
): AppState {
  if (state.activeWorkouts?.some((item) => item.id === workout.id))
    return state;
  return {
    ...state,
    activeWorkouts: [...(state.activeWorkouts ?? []), workout],
  };
}

export function closeWorkout(
  state: AppState,
  id: string,
  finishedAt: string,
): AppState {
  return {
    ...state,
    activeWorkouts: (state.activeWorkouts ?? []).filter(
      (item) => item.id !== id,
    ),
    workoutLogs: state.workoutLogs.map((item) =>
      item.id === id ? { ...item, date: finishedAt } : item,
    ),
  };
}
