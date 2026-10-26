'use client';

import { Check, Info, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MobilityIllustration } from '@/components/mobility-illustration';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { mobilityGuides, resetMobilityKeys } from '@/lib/mobility-guide';
import { mobility } from '@/lib/workout-data';
import { type AppState } from '@/lib/storage';
import { ViewTabs } from '@/components/view-tabs';
import { localDateKey } from '@/lib/local-date';

export function MobilityRoutine({
  state,
  updateState,
  day = localDateKey(),
  initialMode = 'corta',
}: {
  state: AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
  day?: string;
  initialMode?: 'corta' | 'larga';
}) {
  const [mode, setMode] = useState<'corta' | 'larga'>(initialMode);
  const [selected, setSelected] = useState<string | null>(null);
  const items = mode === 'corta' ? mobility.slice(0, 5) : mobility.slice(5);
  const keys = items.map(([name]) => `${day}:${mode}-${name}`);
  const completedCount = keys.filter((key) =>
    state.mobilityDone.includes(key),
  ).length;
  const selectedItem = mobility.find(([name]) => name === selected);
  const selectedKey = selected
    ? `${day}:${mobility.slice(0, 5).some(([name]) => name === selected) ? 'corta' : 'larga'}-${selected}`
    : '';
  const selectedDone = state.mobilityDone.includes(selectedKey);
  const toggleItem = (key: string) =>
    updateState((current) => ({
      ...current,
      mobilityDone: current.mobilityDone.includes(key)
        ? current.mobilityDone.filter((item) => item !== key)
        : [...current.mobilityDone, key],
    }));
  return (
    <div>
      <ViewTabs
        label="Rutina de movilidad"
        value={mode}
        onChange={setMode}
        items={[
          { id: 'corta', label: 'Rutina corta' },
          { id: 'larga', label: 'Rutina larga' },
        ]}
      />
      <div className="mb-3 flex items-center justify-between gap-3">
        <p
          aria-live="polite"
          className="text-sm font-medium text-muted-foreground"
        >
          {completedCount} de {items.length} completados
        </p>
        <Button
          aria-label={`Reiniciar rutina ${mode}`}
          className="min-h-11 rounded-xl px-3"
          disabled={completedCount === 0}
          onClick={() =>
            updateState((current) => ({
              ...current,
              mobilityDone: resetMobilityKeys(current.mobilityDone, keys),
            }))
          }
          variant="outline"
        >
          <RotateCcw className="size-4" /> Reiniciar
        </Button>
      </div>
      <div className="surface divide-y divide-border px-3">
        {items.map(([name, dose, area], index) => {
          const key = keys[index];
          const done = state.mobilityDone.includes(key);
          return (
            <div key={name} className="flex items-center gap-2 py-3">
              <button
                aria-label={`Ver cómo hacer ${name}`}
                className="flex min-h-20 min-w-0 flex-1 items-center gap-3 rounded-xl text-left"
                onClick={() => setSelected(name)}
                type="button"
              >
                {mobilityGuides[name] ? (
                  <span aria-hidden="true" className="mobility-thumbnail">
                    <MobilityIllustration
                      id={mobilityGuides[name].id}
                      name={name}
                    />
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-semibold">
                    {name}
                  </strong>
                  <small className="mt-1 block text-muted-foreground">
                    {dose}
                  </small>
                  <small className="text-xs text-muted-foreground">
                    {area}
                  </small>
                </span>
              </button>
              <button
                aria-label={`${done ? 'Desmarcar' : 'Marcar'} ${name}`}
                aria-pressed={done}
                className={`grid size-11 shrink-0 place-items-center rounded-full ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                onClick={() => toggleItem(key)}
                type="button"
              >
                {done ? (
                  <Check className="size-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex gap-3 rounded-2xl border border-border bg-card p-4">
        <Info className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Indicaciones:</strong> busca una
          tensión cómoda, nunca dolor. Si algo supera 3/10, reduce el rango o
          para.
        </p>
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl sm:max-w-[520px]">
          <DialogTitle>{selected}</DialogTitle>
          <DialogDescription>
            {selectedItem?.[1]} · {selectedItem?.[2]}
          </DialogDescription>
          {selected && mobilityGuides[selected] ? (
            <>
              <div className="overflow-hidden rounded-2xl border border-border bg-muted/50">
                <MobilityIllustration
                  id={mobilityGuides[selected].id}
                  name={selected}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Postura de referencia. Muévete en un rango cómodo y sin dolor.
              </p>
              <ol className="space-y-3">
                {mobilityGuides[selected].steps.map((step, index) => (
                  <li
                    key={index}
                    className="flex gap-3 text-sm leading-relaxed"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Button
                className="mt-2 h-12 w-full rounded-xl font-bold"
                onClick={() => {
                  toggleItem(selectedKey);
                  setSelected(null);
                }}
                variant={selectedDone ? 'outline' : 'default'}
              >
                {selectedDone ? (
                  'Marcar como pendiente'
                ) : (
                  <>
                    <Check className="size-4" /> Marcar como hecho
                  </>
                )}
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
