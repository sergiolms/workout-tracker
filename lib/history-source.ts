import type { AppState } from './storage.ts';

export type HistorySource = {
  loadMonth: (month: string) => Promise<AppState>;
  loadAll: () => Promise<AppState>;
};
