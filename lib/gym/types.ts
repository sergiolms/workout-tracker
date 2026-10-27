import type { GymAvatar } from './appearance.ts';
export type GymReceipt = {
  kind: 'strength' | 'activity' | 'mobility';
  day: string;
  units: number;
  count: number;
  blocked?: boolean;
};
export type GymPlacement = {
  room: 'main' | 'annex';
  x: number;
  y: number;
  rotated: boolean;
  /** Absent in older saves: rotated=false maps to 0°, true to 90°. */
  rotation?: 0 | 90 | 180 | 270;
  /** Optional mounting surface; missing values represent legacy floor objects. */
  wall?: 'left' | 'right';
};
export type GymPurchase = {
  id: string;
  itemId: string;
  paid: number;
  catalogVersion?: string;
  at: string;
  returned?: boolean;
};
export type GymState = {
  version: 1;
  startedAt: string;
  timeZone: string;
  receipts: Record<string, GymReceipt>;
  purchases: Record<string, GymPurchase>;
  placements: Record<string, GymPlacement>;
  finishes: Record<string, { floor?: string; wall?: string }>;
  achievementHistory?: {
    version: 1;
    records: Record<
      string,
      { kind: GymReceipt['kind']; day: string; count: number }
    >;
  };
  avatar?: GymAvatar;
  displays?: Record<string, { shelfId: string; slot: number }>;
  baseline: string[];
};
export type GymCommand =
  | { type: 'import'; gym: GymState }
  | { type: 'restore' }
  | { type: 'backfill-achievements' }
  | { type: 'avatar'; appearance: GymAvatar }
  | { type: 'display'; id: string; shelfId: string; slot: number }
  | {
      type: 'style';
      room: 'main' | 'annex';
      finishes: { floor: string | null; wall: string | null };
    }
  | { type: 'activate'; timeZone: string }
  | { type: 'buy'; id: string; itemId: string }
  | { type: 'return'; id: string }
  | { type: 'place'; id: string; placement: GymPlacement | null }
  | {
      type: 'finish';
      room: 'main' | 'annex';
      surface: 'floor' | 'wall';
      purchaseId: string | null;
    };
