import economy from './economy.json' with { type: 'json' };
export const gymEconomy = economy;
export type GymItem = {
  id: string;
  name: string;
  price: number;
  kind: string;
  width: number;
  depth: number;
  surface?: 'floor' | 'wall';
  starter?: boolean;
};
const sizes: Record<string, [number, number]> = {
  'trophy-cabinet': [3, 1],
  bench: [2, 1],
  rack: [3, 2],
  cable: [3, 2],
  bike: [2, 1],
  treadmill: [3, 2],
  platform: [3, 2],
  'dumbbell-rack': [2, 1],
  mat: [2, 1],
};
export const gymCatalog: GymItem[] = economy.items.map((item) => ({
  ...item,
  width: sizes[item.id]?.[0] ?? 1,
  depth: sizes[item.id]?.[1] ?? 1,
  ...(item.kind === 'finish'
    ? {
        surface: item.id.includes('floor')
          ? ('floor' as const)
          : ('wall' as const),
      }
    : {}),
}));
export const starterItems: GymItem[] = [
  {
    id: 'starter-mat',
    name: 'Esterilla básica',
    price: 0,
    kind: 'equipment',
    width: 2,
    depth: 1,
    starter: true,
  },
  {
    id: 'starter-weights',
    name: 'Mancuernas básicas',
    price: 0,
    kind: 'equipment',
    width: 1,
    depth: 1,
    starter: true,
  },
];
export const gymItem = (id: string) =>
  [...gymCatalog, ...starterItems].find((item) => item.id === id);
