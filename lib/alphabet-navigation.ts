export function resolveAlphabetIndex(letters: string[], available: string[], next: number, direction: number, fallback = 0) {
  const enabled = new Set(available);
  const bounded = Math.max(0, Math.min(letters.length - 1, next));
  const step = direction < 0 ? -1 : 1;
  for (let position = bounded; position >= 0 && position < letters.length; position += step) {
    if (enabled.has(letters[position])) return position;
  }
  for (let position = bounded; position >= 0 && position < letters.length; position -= step) {
    if (enabled.has(letters[position])) return position;
  }
  return fallback;
}

export function advanceAlphabetIndex(letters: string[], available: string[], current: number, steps: number) {
  const direction = Math.sign(steps);
  let index = current;
  for (let count = 0; count < Math.abs(steps); count++) {
    const next = resolveAlphabetIndex(letters, available, index + direction, direction, index);
    if (next === index) break;
    index = next;
  }
  return index;
}
