import type { AppState, ExerciseLog, SetLog, WorkoutLog } from './storage.ts';
import type { Exercise } from './workout-data.ts';
import { exerciseLogMetadata, sameExercise } from './exercise-identity.ts';
import { exerciseSuggestion } from './exercise-log.ts';
import { statusFromLog } from './exercise-sets.ts';

export type WorkoutIdentity = { id: string; week: number; routine: string };
export type ExerciseSnapshot = {
  exercise: Exercise;
  load: number;
  sets: SetLog[];
  rir: number;
  pain: number;
  note: string;
};

export function exerciseLogDraft(
  current: ExerciseSnapshot,
  workout: WorkoutIdentity,
  date: string,
  previousId?: string,
  skipped = false,
): ExerciseLog {
  return {
    id: previousId ?? `${workout.id}:${current.exercise.name}`,
    date,
    week: workout.week,
    routine: workout.routine,
    workoutId: workout.id,
    exercise: current.exercise.name,
    ...exerciseLogMetadata(current.exercise),
    load: current.load,
    sets: current.sets,
    rir: current.rir,
    pain: current.pain,
    note: current.note,
    skipped,
    suggestion: skipped
      ? 'mantener'
      : exerciseSuggestion(current.exercise, current),
  };
}

export function buildWorkoutReview(
  state: AppState,
  identity: WorkoutIdentity,
  exercises: Exercise[],
  current: ExerciseSnapshot,
  date: string,
) {
  const routineLogs = state.exerciseLogs.filter(
    (log) => log.workoutId === identity.id,
  );
  const previous = routineLogs.find((log) =>
    sameExercise(log, current.exercise),
  );
  const currentExerciseLog = current.sets.some((set) => set.done)
    ? exerciseLogDraft(current, identity, date, previous?.id)
    : undefined;
  const logs = currentExerciseLog
    ? [
        ...routineLogs.filter((log) => !sameExercise(log, current.exercise)),
        currentExerciseLog,
      ]
    : routineLogs;
  const plannedSets = state.activeWorkouts?.find(
    (item) => item.id === identity.id,
  )?.plannedSets;
  const workout: WorkoutLog = {
    ...(plannedSets ? { gymTargetSets: plannedSets } : {}),
    ...(state.rotation ? { rotationId: state.rotation.id } : {}),
    id: identity.id,
    date,
    week: identity.week,
    routine: identity.routine,
    routineName:
      state.sessions.find((session) => session.id === identity.routine)?.name ??
      identity.routine,
    notes: state.workoutLogs.find((log) => log.id === identity.id)?.notes ?? '',
    exercises: exercises.map((exercise) => {
      const log = logs.find((item) => sameExercise(item, exercise));
      return {
        name: exercise.name,
        status: log ? statusFromLog(log) : 'pending',
        ...(log ? { logId: log.id } : {}),
      };
    }),
  };
  return { workout, currentExerciseLog, logs };
}
