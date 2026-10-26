import { queryOptions } from '@tanstack/react-query';
import type { HistorySource } from './history-source.ts';
import type { AppState } from './storage.ts';

export function missingHistoryMonths(
  state: AppState | undefined,
  months: string[] | 'all',
  enabled = true,
): string[] {
  if (!enabled || !state?.history || state.history.complete) return [];
  if (months === 'all') return ['all'];
  const loaded = new Set(state.history.loadedMonths);
  return [...new Set(months)].filter((month) => !loaded.has(month)).sort();
}

export function historyQueryOptions(source: HistorySource, month: string) {
  return queryOptions({
    queryKey: ['account', source.accountId, 'history', 2, month] as const,
    queryFn: async ({ signal }) => {
      signal.throwIfAborted();
      const state = await (month === 'all'
        ? source.loadAll()
        : source.loadMonth(month));
      signal.throwIfAborted();
      if (
        state.history &&
        !state.history.complete &&
        (month === 'all' || !state.history.loadedMonths.includes(month))
      )
        throw Error('No se pudieron cargar los registros. Reintenta.');
      return state;
    },
    // A missing month must load again even if an earlier request succeeded
    // before the repository was reset. Already loaded months have no query.
    staleTime: 0,
    gcTime: 0,
  });
}
