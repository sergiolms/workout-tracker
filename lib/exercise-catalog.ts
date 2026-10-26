import catalog from './exercise-catalog.json';
import { normalizeExerciseSearch, spanishExerciseName } from './exercise-translation';
import { matchesCatalogFilters, type CatalogFilters } from './catalog-filters';
import { exerciseSearchScore, searchWords } from './exercise-search';

export type CatalogExercise = {
  id: string;
  name: string;
  muscle: string;
  bodyPart: string;
  equipment: string;
  target: string;
  image: string;
  description: string;
};

export const exerciseCatalog = catalog as CatalogExercise[];

// Keep exercise media local: it is reliable during a workout and becomes available
// to the service worker after the first request.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const IMAGE_BASE = `${BASE_PATH}/exercise-images`;
export const exerciseImageUrl = (image: string) => /^data:image\/(webp|jpeg|png);base64,/.test(image) ? image : `${IMAGE_BASE}/${image}`;

const catalogById = new Map(exerciseCatalog.map((item) => [item.id, item]));
const catalogByName = new Map(exerciseCatalog.map((item) => [item.name.toLowerCase(), item]));

const descriptions: Record<string, string> = {
  'Hip thrust': 'Apoya la parte alta de la espalda en el banco y planta los pies. Eleva la cadera apretando los glúteos, sin arquear la espalda, y baja con control.',
  'Remo con pecho apoyado': 'Apoya el pecho en el banco. Lleva los codos hacia atrás sin despegar el torso y vuelve lentamente a la posición inicial.',
  'Remo unilateral': 'Apoya una mano en un banco estable. Lleva la carga hacia la cadera sin girar el tronco y baja con control; repite al otro lado.',
  'Peso muerto kettlebell': 'Coloca la pesa entre los pies. Lleva la cadera atrás, agarra el asa y ponte de pie con la espalda estable y la carga cerca del cuerpo.',
  'Peso muerto kettlebell desde altura': 'Coloca la pesa sobre un apoyo estable para acortar el recorrido. Lleva la cadera atrás y levanta la pesa extendiendo cadera y rodillas con control.',
  'Face pull': 'Con una cuerda en la polea a la altura de la cara, tira hacia la frente separando las manos. Mantén el tronco estable y vuelve despacio.',
  'Step-up alto / split squat asistido': 'Sube al cajón empujando con el pie de arriba, usando un apoyo estable si lo necesitas. Como alternativa, haz una sentadilla con un pie adelantado y apoyo para el equilibrio.',
  'Suitcase carry': 'Lleva una carga en una mano y camina erguido con pasos cortos. Mantén los hombros nivelados; cambia de lado al terminar.',
  'Levantarse del suelo': 'Baja al suelo y vuelve a ponerte de pie con control. Usa las manos o un apoyo estable cuando lo necesites.',
};

export function getExerciseDescription(name: string, catalogId?: string) {
  return descriptions[name] || getExerciseDetails(name, catalogId)?.description || 'Realiza el movimiento con control y en un rango cómodo. Pide ayuda para ajustar la posición si no conoces el ejercicio.';
}

const exerciseAliases: Record<string, string> = {
  'prensa de piernas': '0739',
  'prensa / hack squat': '0739',
  'press de pecho en máquina': '0577',
  'press pecho máquina': '0577',
  'press pecho': '0577',
  'remo sentado': '0180',
  'curl femoral': '0586',
  'jalón al pecho': '2330',
  'farmer carry': '2133',
  'farmer carry pesado': '2133',
  'sentadilla a banco / goblet squat': '1760',
  'goblet squat / sentadilla banco': '1760',
  'goblet squat': '1760',
  'press hombros máquina': '0603',
  'press hombro': '0405',
  'press pecho inclinado': '1299',
  'press inclinado': '1299',
  'pallof press': '0979',
  'peso muerto rumano mancuernas': '1459',
  'peso muerto rumano': '0085',
  'step-up cajón bajo': '0431',
  'step-up': '0431',
  'step-up alterno': '0431',
  'elevación gemelos': '1370',
  'cable chop': '0243',
  'flexión inclinada / press pecho': '0577',
};

export function getExerciseDetails(name: string, catalogId?: string): CatalogExercise | undefined {
  if (catalogId) return catalogById.get(catalogId);
  const normalized = name.trim().toLowerCase();
  return catalogById.get(exerciseAliases[normalized]) ?? catalogByName.get(normalized);
}

export function getExerciseDisplayName(name: string, catalogId?: string): string {
  const item = getExerciseDetails(name, catalogId);
  if (!item || (!catalogId && item.name.toLowerCase() !== name.trim().toLowerCase())) return name;
  return spanishExerciseName(item.name);
}

const indexedCatalog = exerciseCatalog.map((item) => {
  const spanishName = spanishExerciseName(item.name);
  return {
    item,
    spanishName,
    names: searchWords(`${spanishName} ${item.name}`),
    attributes: searchWords(`${item.target} ${item.bodyPart} ${item.equipment} ${item.muscle}`),
  };
}).sort((a, b) => a.spanishName.localeCompare(b.spanishName, 'es-ES'));

export const catalogLetters = Array.from(new Set(indexedCatalog.map(({ spanishName }) =>
  normalizeExerciseSearch(spanishName).charAt(0).toUpperCase(),
).filter((letter) => /^[A-Z]$/.test(letter)))).sort((a, b) => a.localeCompare(b, 'es-ES'));

export function browseCatalog(query: string, letter: string, page: number, pageSize = 20) {
  const normalizedQuery = normalizeExerciseSearch(query);
  const matches = indexedCatalog.filter(({ spanishName, names, attributes }) =>
    normalizedQuery
      ? exerciseSearchScore(searchWords(query), names, attributes) > 0
      : !letter || normalizeExerciseSearch(spanishName).startsWith(letter.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  return {
    items: matches.slice(safePage * pageSize, (safePage + 1) * pageSize).map(({ item }) => item),
    total: matches.length,
    page: safePage,
    totalPages,
  };
}

export function searchCatalog(query: string, limit = 40): CatalogExercise[] {
  return browseCatalog(query, '', 0, limit).items;
}

/** One continuous catalogue; alphabet navigation never removes other sections. */
export function exerciseCatalogSections(query = '', filters: CatalogFilters = {}) {
  const tokens = searchWords(query);
  if (tokens.length) {
    const matches = indexedCatalog.filter(({ item }) => matchesCatalogFilters(item, filters))
      .map(entry => {
        const score = exerciseSearchScore(tokens, entry.names, entry.attributes);
        return { ...entry, score: score ? score - entry.names.length * 0.001 : 0 };
      })
      .filter(entry => entry.score > 0).sort((a, b) => b.score - a.score || a.spanishName.localeCompare(b.spanishName, 'es'));
    return matches.length ? [{ letter: 'Resultados', items: matches.map(entry => entry.item) }] : [];
  }
  const sections = new Map<string, CatalogExercise[]>();
  for (const { item, spanishName } of indexedCatalog) {
    if (!matchesCatalogFilters(item, filters)) continue;
    const initial = normalizeExerciseSearch(spanishName).charAt(0).toUpperCase();
    const letter = /^[A-Z]$/.test(initial) ? initial : '#';
    const items = sections.get(letter) ?? [];
    items.push(item);
    sections.set(letter, items);
  }
  return [...sections].map(([letter, items]) => ({ letter, items }));
}
