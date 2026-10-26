'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  QueryClientProvider,
  useQueries,
  type QueryClient,
} from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import type { AppState } from '@/lib/storage';

import type { HistorySource } from '@/lib/history-source';
import { historyQueryOptions, missingHistoryMonths } from '@/lib/history-query';
import { createAccountQueryClient } from '@/lib/account-query';

const HistoryContext = createContext<{
  source: HistorySource | null;
  client: QueryClient;
} | null>(null);

export function HistoryProvider({
  value,
  children,
}: {
  value: HistorySource | null;
  children: ReactNode;
}) {
  const context = useMemo(
    () => ({
      source: value,
      client: value?.client ?? createAccountQueryClient(),
      scope: crypto.randomUUID(),
    }),
    [value],
  );
  return (
    <QueryClientProvider key={context.scope} client={context.client}>
      <HistoryContext value={context}>{children}</HistoryContext>
    </QueryClientProvider>
  );
}

export const useHistorySource = () =>
  useContext(HistoryContext)?.source ?? null;

export function useHistoryMonths(
  state: AppState | undefined,
  months: string[] | 'all',
  enabled = true,
) {
  const context = useContext(HistoryContext);
  const [fallbackClient] = useState(createAccountQueryClient);
  const source = context?.source;
  const missing = source ? missingHistoryMonths(state, months, enabled) : [];
  const queries = useQueries(
    {
      queries: source
        ? missing.map((month) => historyQueryOptions(source, month))
        : [],
    },
    context?.client ?? fallbackClient,
  );
  const failure = queries.find((query) => query.isError)?.error;
  return {
    loading: missing.length > 0,
    error: failure?.message ?? '',
    retry: () => {
      for (const query of queries) if (query.isError) void query.refetch();
    },
  };
}

export function HistoryLoading({
  status,
  children,
}: {
  status: ReturnType<typeof useHistoryMonths>;
  children: ReactNode;
}) {
  if (status.error)
    return (
      <div role="alert" className="py-4 text-sm">
        <p>{status.error}</p>
        <Button
          variant="outline"
          className="mt-2 min-h-11"
          onClick={status.retry}
        >
          Reintentar
        </Button>
      </div>
    );
  if (status.loading)
    return (
      <output className="block py-4 text-sm text-muted-foreground">
        Cargando registros…
      </output>
    );
  return children;
}

export function monthsBetween(start: Date, end: Date) {
  const months: string[] = [];
  const date = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
  );
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1);
  while (date.getTime() <= last) {
    months.push(date.toISOString().slice(0, 7));
    date.setUTCMonth(date.getUTCMonth() + 1);
  }
  return months;
}
