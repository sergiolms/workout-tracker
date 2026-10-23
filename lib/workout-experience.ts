import type { AppState, ExerciseLog } from './storage.ts';
import { workingSets } from './exercise-sets.ts';

// Compare only like-for-like sets; a higher load with fewer reps is mixed.
export function performanceTrend(load: number, reps: number, previousLoad: number, previousReps: number): 'up' | 'down' | 'same' | 'mixed' {
  if (load === previousLoad && reps === previousReps) return 'same';
  if (load >= previousLoad && reps >= previousReps) return 'up';
  if (load <= previousLoad && reps <= previousReps) return 'down';
  return 'mixed';
}

export function previousExerciseLog(logs: ExerciseLog[], exercise: string, workoutId: string): ExerciseLog | undefined {
  return logs.filter(log => log.exercise === exercise && log.workoutId !== workoutId && !log.skipped && workingSets(log.sets).some(set => set.done))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
}

// Undo only this action, never a snapshot of the whole account or newer edits.
export function undoSkippedExercise(state: AppState, skipped: ExerciseLog, previous: ExerciseLog | undefined, previousWorkouts: AppState['workoutLogs']): AppState {
  const current = state.exerciseLogs.find(log => log.id === skipped.id);
  if (JSON.stringify(current) !== JSON.stringify(skipped)) return state;
  return {
    ...state,
    exerciseLogs: previous ? state.exerciseLogs.map(log => log.id === skipped.id ? previous : log) : state.exerciseLogs.filter(log => log.id !== skipped.id),
    workoutLogs: state.workoutLogs.map(workout => workout.id === skipped.workoutId ? {
      ...workout,
      exercises: workout.exercises.map(item => item.logId === skipped.id ? previousWorkouts.find(old => old.id === workout.id)?.exercises.find(old => old.name === item.name) ?? item : item),
    } : workout),
  };
}

export function remainingRest(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
