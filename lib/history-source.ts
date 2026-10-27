import type { AppState } from './storage.ts';
import type { QueryClient } from '@tanstack/react-query';
import type { GymCommand } from './gym/types.ts';

export type HistorySource = {
  accountId: string;
  client: QueryClient;
  gymCommand?: (command: GymCommand) => Promise<AppState>;
  loadMonth: (month: string) => Promise<AppState>;
  loadAll: () => Promise<AppState>;
};
