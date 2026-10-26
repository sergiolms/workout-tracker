const stopWords = new Set([
  'de',
  'del',
  'con',
  'en',
  'a',
  'el',
  'la',
  'los',
  'las',
  'the',
  'with',
]);
export function searchWords(value: string): string[] {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !stopWords.has(word))
    .map((word) =>
      word.length > 4 && word.endsWith('s') && !word.endsWith('ss')
        ? word.slice(0, -1)
        : word,
    );
}

function editDistance(a: string, b: string): number {
  if (a.length === b.length) {
    const mismatches = Array.from(a, (char, i) =>
      char !== b[i] ? i : -1,
    ).filter((i) => i >= 0);
    if (mismatches.length === 2) {
      const [i, j] = mismatches;
      if (j === i + 1 && a[i] === b[j] && a[j] === b[i]) return 1;
    }
  }
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++)
      row[j] = Math.min(
        row[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    previous = row;
  }
  return previous[b.length];
}

function wordScore(query: string, word: string): number {
  if (word === query) return 12;
  if (word.startsWith(query)) return 8;
  const tolerance = query.length >= 7 ? 2 : query.length >= 4 ? 1 : 0;
  if (!tolerance || Math.abs(query.length - word.length) > tolerance) return 0;
  return editDistance(query, word) <= tolerance ? 3 : 0;
}

export function exerciseSearchScore(
  query: string[],
  names: string[],
  attributes: string[],
): number {
  let total = 0;
  for (const token of query) {
    const title = Math.max(0, ...names.map((word) => wordScore(token, word)));
    const attribute =
      Math.max(0, ...attributes.map((word) => wordScore(token, word))) / 2;
    const score = Math.max(title, attribute);
    if (!score) return 0;
    total += score;
  }
  return query.length ? total : 1;
}
