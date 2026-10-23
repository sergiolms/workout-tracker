export type CatalogFilters = { bodyPart?: string; equipment?: string };

export const bodyPartOptions = [
  ['back', 'Espalda'], ['chest', 'Pecho'], ['shoulders', 'Hombros'],
  ['upper arms', 'Brazos'], ['lower arms', 'Antebrazos'],
  ['upper legs', 'Piernas'], ['lower legs', 'Gemelos'],
  ['waist', 'Abdomen'], ['cardio', 'Cardio'], ['neck', 'Cuello'],
] as const;

export const equipmentOptions = [
  ['bodyweight', 'Peso corporal'], ['dumbbell', 'Mancuernas'],
  ['cable', 'Polea'], ['barbell', 'Barra'], ['machine', 'Máquinas'],
  ['band', 'Bandas'], ['kettlebell', 'Pesa rusa'], ['other', 'Otros'],
] as const;

export function equipmentGroup(equipment: string): string {
  if (equipment === 'body weight') return 'bodyweight';
  if (equipment === 'dumbbell') return 'dumbbell';
  if (equipment === 'cable') return 'cable';
  if (['barbell', 'ez barbell', 'olympic barbell', 'trap bar'].includes(equipment)) return 'barbell';
  if (['leverage machine', 'smith machine', 'sled machine', 'assisted'].includes(equipment)) return 'machine';
  if (['band', 'resistance band'].includes(equipment)) return 'band';
  if (equipment === 'kettlebell') return 'kettlebell';
  return 'other';
}

export function matchesCatalogFilters(exercise: { bodyPart: string; equipment: string }, filters: CatalogFilters): boolean {
  return (!filters.bodyPart || exercise.bodyPart === filters.bodyPart)
    && (!filters.equipment || equipmentGroup(exercise.equipment) === filters.equipment);
}
