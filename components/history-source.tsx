'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import type { AppState } from '@/lib/storage';

import type { HistorySource } from '@/lib/history-source';
const HistoryContext = createContext<HistorySource | null>(null);
export const HistoryProvider = HistoryContext.Provider;
export const useHistorySource = () => useContext(HistoryContext);

export function useHistoryMonths(
  state: AppState | undefined,
  months: string[] | 'all',
  enabled = true,
) {
  const source = useHistorySource();
  const requested =
    months === 'all' ? 'all' : [...new Set(months)].sort().join(',');
  const loaded = state?.history?.loadedMonths.join(',') ?? '';
  const missing = useMemo(() => {
    if (!enabled || !source || !state?.history || state.history.complete)
      return [];
    if (requested === 'all') return ['all'];
    const known = new Set(loaded.split(','));
    return requested.split(',').filter((month) => month && !known.has(month));
  }, [enabled, source, requested, loaded, state?.history]);
  const missingKey = missing.join(',');
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${missingKey}:${attempt}`;
  useEffect(() => {
    if (!source || !missingKey) return;
    let active = true;
    const load =
      missingKey === 'all'
        ? source.loadAll()
        : Promise.all(missingKey.split(',').map(source.loadMonth));
    void load.catch((reason) => {
      if (active)
        setFailure({
          key: requestKey,
          message:
            reason instanceof Error
              ? reason.message
              : 'No se pudieron cargar los registros.',
        });
    });
    return () => {
      active = false;
    };
  }, [source, missingKey, requestKey]);
  return {
    loading: Boolean(missingKey),
    error: failure?.key === requestKey ? failure.message : '',
    retry: () => setAttempt((value) => value + 1),
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
