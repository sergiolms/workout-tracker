import type { GymPlacement } from './types.ts';

export function draggedPlacement(
  start: GymPlacement,
  deltaX: number,
  deltaY: number,
  size: number,
  width: number,
  depth: number,
): GymPlacement {
  const w = start.rotated ? depth : width;
  const d = start.rotated ? width : depth;
  return {
    ...start,
    x: Math.max(
      0,
      Math.min(size - w, start.x + Math.round(deltaX / 72 + deltaY / 36)),
    ),
    y: Math.max(
      0,
      Math.min(size - d, start.y + Math.round(deltaY / 36 - deltaX / 72)),
    ),
  };
}
