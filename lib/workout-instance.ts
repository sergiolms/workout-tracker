import { sameExercise } from './exercise-identity.ts';
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
    activeWorkouts: [
      ...(state.activeWorkouts ?? []),
      {
        ...workout,
        exercises:
          workout.exercises ??
          state.sessions.find((session) => session.id === workout.routine)
            ?.exercises,
        plannedSets:
          workout.plannedSets ??
          state.sessions
            .find((session) => session.id === workout.routine)
            ?.exercises.reduce(
              (total, exercise) => total + Math.max(0, exercise.sets),
              0,
            ),
      },
    ],
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

// A replacement belongs to a single workout; routine templates are never edited.
export function replaceWorkoutExercise(
  state: AppState,
  id: string,
  index: number,
  exercise: import('./workout-data.ts').Exercise,
): AppState {
  const workout = state.activeWorkouts?.find((w) => w.id === id);
  if (!workout) return state;
  const exercises =
    workout.exercises ??
    state.sessions.find((s) => s.id === workout.routine)?.exercises ??
    [];
  const previous = exercises[index];
  if (!previous) return state;
  return {
    ...state,
    activeWorkouts: state.activeWorkouts?.map((w) =>
      w.id === id
        ? {
            ...w,
            exercises: exercises.map((e, i) => (i === index ? exercise : e)),
          }
        : w,
    ),
    exerciseLogs: state.exerciseLogs.filter(
      (log) => log.workoutId !== id || !sameExercise(log, previous),
    ),
  };
}

export function cancelWorkout(state: AppState, id: string): AppState {
  return {
    ...state,
    activeWorkouts: (state.activeWorkouts ?? []).filter((w) => w.id !== id),
    exerciseLogs: state.exerciseLogs.filter((log) => log.workoutId !== id),
    workoutLogs: state.workoutLogs.filter((log) => log.id !== id),
  };
}
