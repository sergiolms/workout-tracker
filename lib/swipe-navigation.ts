export type SwipeSample = { startX: number; startY: number; endX: number; endY: number; elapsed: number };

export function swipeTargetIndex(current: number, count: number, sample: SwipeSample): number | null {
  const dx = sample.endX - sample.startX;
  const dy = sample.endY - sample.startY;
  if (current < 0 || current >= count || sample.elapsed < 0 || sample.elapsed > 700 || Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  const target = current + (dx < 0 ? 1 : -1);
  return target >= 0 && target < count ? target : null;
}
