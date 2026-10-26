import type { CatalogExercise } from './exercise-catalog.ts';
import type { Exercise } from './workout-data.ts';

export function appendCatalogExercises(
  current: Exercise[],
  selected: CatalogExercise[],
): Exercise[] {
  const result = [...current];
  for (const item of selected) {
    if (
      result.some(
        (exercise) =>
          exercise.catalogId === item.id || exercise.name === item.name,
      )
    )
      continue;
    result.push({
      name: item.name,
      catalogId: item.id,
      target: '3×8–12 · RIR 2–3',
      sets: 3,
      minReps: 8,
      maxReps: 12,
      minRir: 2,
      maxRir: 3,
      increment: 2.5,
      unit: 'kg',
    });
  }
  return result;
}

export function toggleCatalogSelection(
  selected: CatalogExercise[],
  item: CatalogExercise,
): CatalogExercise[] {
  return selected.some((exercise) => exercise.id === item.id)
    ? selected.filter((exercise) => exercise.id !== item.id)
    : [...selected, item];
}
