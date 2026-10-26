import type { AppState } from './storage.ts';
import type { QueryClient } from '@tanstack/react-query';

export type HistorySource = {
  accountId: string;
  client: QueryClient;
  loadMonth: (month: string) => Promise<AppState>;
  loadAll: () => Promise<AppState>;
};
