'use client';
import { useEffect } from 'react';
import type { AccountSync } from '@/lib/account-sync';
import type { AppState } from '@/lib/storage';
import { createWalkLog } from '@/lib/walk-log';

export function useWalkTool(
  session: AccountSync | null,
  hydrated: boolean,
  updateState: (updater: (state: AppState) => AppState) => void,
) {
  useEffect(() => {
    if (!session || !hydrated) return;
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'log_walk',
          title: 'Registrar caminata',
          description:
            'Registra una caminata con minutos y pasos en Zero to Hero.',
          inputSchema: {
            type: 'object',
            properties: {
              minutes: { type: 'number', minimum: 1, maximum: 1440 },
              steps: { type: 'integer', minimum: 0, maximum: 1e7 },
            },
            required: ['minutes', 'steps'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: (input: unknown) => {
            if (!session.canEdit)
              throw new Error('Espera a que termine de abrirse tu diario.');
            const log = createWalkLog(input);
            updateState((current) => ({
              ...current,
              cardioLogs: [...current.cardioLogs, log],
            }));
            return { status: 'pending', id: log.id };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [session, hydrated, updateState]);
}
