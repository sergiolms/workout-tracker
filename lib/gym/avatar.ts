import type { GymItem } from './catalog.ts';
import type { GymPlacement } from './types.ts';
import type { GymState } from './types.ts';
import { ownedItems, roomSize } from './engine.ts';
export {
  defaultAvatar,
  avatarOutfits,
  avatarSkins,
  type GymAvatar,
} from './appearance.ts';
export type Cell = { x: number; y: number };
export const isWalkableItem = (item: GymItem) =>
  ['starter-mat', 'mat', 'platform'].includes(item.id);
export function surfaceElevation(gym: GymState, room: string, cell: Cell) {
  for (const entry of ownedItems(gym)) {
    const place = gym.placements[entry.id];
    if (!place || place.room !== room || !isWalkableItem(entry.item)) continue;
    const width = place.rotated ? entry.item.depth : entry.item.width,
      depth = place.rotated ? entry.item.width : entry.item.depth;
    if (
      cell.x >= place.x &&
      cell.x < place.x + width &&
      cell.y >= place.y &&
      cell.y < place.y + depth
    )
      return entry.item.id === 'platform' ? 5 : 3;
  }
  return 0;
}
export type GymAction =
  | 'idle'
  | 'walk'
  | 'train'
  | 'stretch'
  | 'drink'
  | 'cycle'
  | 'run'
  | 'press'
  | 'pull'
  | 'squat';
export type GymInteraction = {
  id: string;
  action: GymAction;
  path: Cell[];
  access: Cell;
  position: Cell;
  elevation: number;
  duration: number;
};
const actions: Record<string, GymAction> = {
  'starter-mat': 'stretch',
  mat: 'stretch',
  platform: 'squat',
  'starter-weights': 'train',
  kettlebells: 'train',
  'dumbbell-rack': 'train',
  bench: 'press',
  rack: 'squat',
  cable: 'pull',
  bike: 'cycle',
  treadmill: 'run',
  water: 'drink',
};
function itemPoint(
  item: GymItem,
  place: GymPlacement,
  x: number,
  y: number,
): Cell {
  return {
    x: place.x + (place.rotated ? item.depth - y : x) - 0.5,
    y: place.y + (place.rotated ? x : y) - 0.5,
  };
}
export function planGymInteraction(
  gym: GymState,
  room: string,
  start: Cell,
  step: number,
): GymInteraction | null {
  const free = walkableGym(gym, room);
  const targets = ownedItems(gym).filter(
    (entry) =>
      gym.placements[entry.id]?.room === room && actions[entry.item.id],
  );
  for (let attempt = 0; attempt < targets.length; attempt++) {
    const target = targets[(step + attempt) % targets.length],
      place = gym.placements[target.id],
      item = target.item;
    const width = place.rotated ? item.depth : item.width,
      depth = place.rotated ? item.width : item.depth;
    const candidates = free.filter((p) =>
      isWalkableItem(item)
        ? p.x >= place.x &&
          p.x < place.x + width &&
          p.y >= place.y &&
          p.y < place.y + depth
        : ((p.x === place.x - 1 || p.x === place.x + width) &&
            p.y >= place.y &&
            p.y < place.y + depth) ||
          ((p.y === place.y - 1 || p.y === place.y + depth) &&
            p.x >= place.x &&
            p.x < place.x + width),
    );
    const routes = candidates
      .map((access) => ({ access, path: gymPath(free, start, access) }))
      .filter(
        (route) =>
          route.path.length ||
          (route.access.x === start.x && route.access.y === start.y),
      )
      .sort((a, b) => a.path.length - b.path.length);
    const route = routes[0];
    if (!route) continue;
    let position = route.access,
      elevation = surfaceElevation(gym, room, route.access);
    if (item.id === 'bike') {
      position = itemPoint(item, place, 0.62, 0.42);
      elevation = 20;
    }
    if (item.id === 'treadmill') {
      position = itemPoint(item, place, 1.2, 1);
      elevation = 8;
    }
    if (item.id === 'bench') {
      position = itemPoint(item, place, 0.55, 0.5);
      elevation = -5;
    }
    return {
      id: target.id,
      action: actions[item.id],
      ...route,
      position,
      elevation,
      duration: item.id === 'water' ? 5 : 9,
    };
  }
  return null;
}
export function walkableGym(gym: GymState, room: string): Cell[] {
  const size = roomSize(gym, room),
    blocked = new Set<string>();
  for (const entry of ownedItems(gym)) {
    const p = gym.placements[entry.id];
    if (!p || p.room !== room || isWalkableItem(entry.item)) continue;
    const w = p.rotated ? entry.item.depth : entry.item.width,
      d = p.rotated ? entry.item.width : entry.item.depth;
    for (let x = p.x; x < p.x + w; x++)
      for (let y = p.y; y < p.y + d; y++) blocked.add(`${x}:${y}`);
  }
  return Array.from({ length: size * size }, (_, i) => ({
    x: i % size,
    y: Math.floor(i / size),
  })).filter((p) => !blocked.has(`${p.x}:${p.y}`));
}
export function gymPath(cells: Cell[], start: Cell, end: Cell): Cell[] {
  const key = (p: Cell) => `${p.x}:${p.y}`,
    available = new Set(cells.map(key));
  if (!available.has(key(start)) || !available.has(key(end))) return [];
  const queue = [start],
    previous = new Map<string, Cell | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (key(current) === key(end)) {
      const path: Cell[] = [];
      let p: Cell | null = current;
      while (p && key(p) !== key(start)) {
        path.unshift(p);
        p = previous.get(key(p)) ?? null;
      }
      return path;
    }
    for (const delta of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const p = { x: current.x + delta[0], y: current.y + delta[1] };
      if (available.has(key(p)) && !previous.has(key(p))) {
        previous.set(key(p), current);
        queue.push(p);
      }
    }
  }
  return [];
}
