import type { Exercise } from './workout-data';
import type { AppState, ExerciseLog } from './storage';
import { statusFromLog } from './workout-history.ts';

export function exerciseSuggestion(exercise: Pick<Exercise, 'minReps' | 'maxReps'>, log: Pick<ExerciseLog, 'sets' | 'rir' | 'pain'>): ExerciseLog['suggestion'] {
  if (log.pain >= 4 || log.rir < 1 || log.sets.some((set) => set.reps < exercise.minReps)) return 'bajar';
  return log.sets.length > 0 && log.sets.every((set) => set.done && set.reps >= exercise.maxReps) && log.rir >= 1 ? 'subir' : 'mantener';
}

export function saveExerciseLog(state: AppState, log: ExerciseLog): AppState {
  return {
    ...state,
    exerciseLogs: [...state.exerciseLogs.filter((item) => item.id !== log.id), log],
    workoutLogs: state.workoutLogs.map((workout) => workout.id === log.workoutId ? {
      ...workout, exercises: workout.exercises.map((item) => item.name === log.exercise ? { ...item, status: statusFromLog(log), logId: log.id } : item),
    } : workout),
  };
}
