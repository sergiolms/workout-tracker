import catalog from './exercise-catalog.json';

export type CatalogExercise = {
  id: string;
  name: string;
  muscle: string;
  bodyPart: string;
  equipment: string;
  target: string;
  image: string;
};

export const exerciseCatalog = catalog as CatalogExercise[];

// Images live in a tracked repo folder and are served from GitHub's raw CDN so the
// static bundle stays small and paths work regardless of the Pages base path.
const IMAGE_BASE = 'https://raw.githubusercontent.com/sergiolms/workout-tracker/main/exercise-images';
export const exerciseImageUrl = (image: string) => `${IMAGE_BASE}/${image}`;

export function searchCatalog(query: string, limit = 40): CatalogExercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return exerciseCatalog.slice(0, limit);
  const results: CatalogExercise[] = [];
  for (const item of exerciseCatalog) {
    if (
      item.name.toLowerCase().includes(q) ||
      item.target.toLowerCase().includes(q) ||
      item.bodyPart.toLowerCase().includes(q) ||
      item.equipment.toLowerCase().includes(q)
    ) {
      results.push(item);
      if (results.length >= limit) break;
    }
  }
  return results;
}
