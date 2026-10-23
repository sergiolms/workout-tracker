export function virtualWindow(heights: number[], scrollTop: number, viewport: number, overscan = 240) {
  const offsets = [0];
  for (const height of heights) offsets.push(offsets.at(-1)! + height);
  const first = (value: number) => {
    let low = 0; let high = heights.length;
    while (low < high) { const middle = Math.floor((low + high) / 2); if (offsets[middle + 1] <= value) low = middle + 1; else high = middle; }
    return Math.min(Math.max(0, heights.length - 1), low);
  };
  return { offsets, total: offsets.at(-1)!, start: first(Math.max(0, scrollTop - overscan)), end: Math.min(heights.length, first(scrollTop + viewport + overscan) + 1), anchor: first(scrollTop) };
}
