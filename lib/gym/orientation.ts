import type { GymPlacement } from './types.ts';

export const gymRotations = [0, 90, 180, 270] as const;
export type GymRotation = (typeof gymRotations)[number];
export const placementRotation = (
  placement: Pick<GymPlacement, 'rotated' | 'rotation'>,
): GymRotation => placement.rotation ?? (placement.rotated ? 90 : 0);

export function placementSize(
  item: { width: number; depth: number },
  placement: Pick<GymPlacement, 'rotated' | 'rotation'>,
) {
  const swapped = placementRotation(placement) % 180 !== 0;
  return {
    width: swapped ? item.depth : item.width,
    depth: swapped ? item.width : item.depth,
  };
}

export function rotatePlacement(placement: GymPlacement): GymPlacement {
  const rotation = ((placementRotation(placement) + 90) % 360) as GymRotation;
  return { ...placement, rotation, rotated: rotation % 180 !== 0 };
}

/** Rotate in floor coordinates, retaining the upper-left corner of the footprint. */
export function furniturePoint(
  item: { width: number; depth: number },
  placement: GymPlacement,
  [x, y]: readonly [number, number],
): [number, number] {
  switch (placementRotation(placement)) {
    case 90:
      return [placement.x + item.depth - y, placement.y + x];
    case 180:
      return [placement.x + item.width - x, placement.y + item.depth - y];
    case 270:
      return [placement.x + y, placement.y + item.width - x];
    default:
      return [placement.x + x, placement.y + y];
  }
}
