'use client';

import { Cloud, HeartPulse, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AccessScreen({
  busy,
  error,
  cloudAvailable,
  onLocal,
  onSync,
  dark,
}: {
  busy: boolean;
  error: string;
  cloudAvailable: boolean;
  onLocal: () => void;
  onSync: () => void;
  dark: boolean;
}) {
  return (
    <div className={dark ? 'dark' : ''}>
      <main className="grid min-h-dvh place-items-center bg-background px-6 py-12 text-foreground">
        <section className="w-full max-w-sm">
          <HeartPulse
            className="mb-6 size-12 text-primary"
            strokeWidth={2}
            aria-hidden="true"
          />
          <p className="eyebrow">Zero to Hero</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Elige cómo guardar
          </h1>
          <div className="mt-9 space-y-3">
            <Button
              className="min-h-14 w-full justify-start px-4"
              onClick={onLocal}
              disabled={busy}
            >
              <Smartphone aria-hidden="true" /> Usar sin cuenta (sólo local)
            </Button>
            <Button
              className="min-h-14 w-full justify-start px-4"
              variant="outline"
              onClick={onSync}
              disabled={busy || !cloudAvailable}
            >
              <Cloud aria-hidden="true" />{' '}
              {busy ? 'Conectando…' : 'Sincronizar con una cuenta'}
            </Button>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Sin cuenta, tus datos se guardan sólo en este navegador. Puedes
            sincronizarlos más adelante. Exporta una copia antes de borrar los
            datos del navegador.
          </p>
          {!cloudAvailable ? (
            <p className="mt-3 text-sm text-muted-foreground">
              La sincronización no está disponible en esta instalación.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
