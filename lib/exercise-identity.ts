import type { Exercise } from './workout-data.ts';
import type { ExerciseLog } from './storage.ts';

const normalized = (name: string) => name.trim().normalize('NFKC').toLocaleLowerCase('es-ES');
export function exerciseIdentity(exercise: Pick<Exercise, 'name' | 'id' | 'catalogId'>): string {
  return exercise.id ?? (exercise.catalogId ? `catalog:${exercise.catalogId}` : `name:${normalized(exercise.name)}`);
}
export function sameExercise(log: Pick<ExerciseLog, 'exercise' | 'exerciseId'>, exercise: Pick<Exercise, 'name' | 'id' | 'catalogId'>): boolean {
  return log.exerciseId ? log.exerciseId === exerciseIdentity(exercise) : normalized(log.exercise) === normalized(exercise.name);
}
