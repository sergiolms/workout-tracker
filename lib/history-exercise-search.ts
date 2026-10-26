import { exerciseSearchScore, searchWords } from './exercise-search.ts';

export type HistorySearchChoice<T> = {
  value: T;
  label: string;
  originalName: string;
};
export function searchHistoryExercises<T>(
  choices: HistorySearchChoice<T>[],
  query: string,
): HistorySearchChoice<T>[] {
  const tokens = searchWords(query);
  return choices
    .map((choice) => ({
      choice,
      score: exerciseSearchScore(
        tokens,
        searchWords(`${choice.label} ${choice.originalName}`),
        [],
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.choice.label.localeCompare(b.choice.label, 'es-ES'),
    )
    .map((entry) => entry.choice);
}
