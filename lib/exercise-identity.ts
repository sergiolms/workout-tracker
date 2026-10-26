import type { Exercise } from './workout-data.ts';
import type { ExerciseLog } from './storage.ts';

const normalized = (name: string) => name.trim().normalize('NFKC').toLocaleLowerCase('es-ES');
export function exerciseIdentity(exercise: Pick<Exercise, 'name' | 'id' | 'catalogId'>): string {
  return exercise.id ?? (exercise.catalogId ? `catalog:${exercise.catalogId}` : `name:${normalized(exercise.name)}`);
}
export function sameExercise(log: Pick<ExerciseLog, 'exercise' | 'exerciseId'>, exercise: Pick<Exercise, 'name' | 'id' | 'catalogId'>): boolean {
  return log.exerciseId ? log.exerciseId === exerciseIdentity(exercise) : normalized(log.exercise) === normalized(exercise.name);
}

export function exerciseLogMetadata(exercise: Exercise) {
  return { exerciseId: exerciseIdentity(exercise), unit: exercise.unit ?? 'kg', mode: exercise.mode ?? 'reps', loadKind: exercise.loadKind ?? (exercise.unit === 'reps' ? 'none' : 'total') } as const;
}
export function loadLabel(kind?: Exercise['loadKind'], unit = 'kg') {
  return `${unit}${kind === 'perHand' ? '/mancuerna' : kind === 'added' ? ' de lastre' : kind === 'assistance' ? ' de ayuda' : ''}`;
}
