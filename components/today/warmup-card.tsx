'use client';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { useState, useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { warmup } from '@/lib/workout-data';
import { type AppState } from '@/lib/storage';
import { AnimatedDisclosure } from '@/components/motion-surface';
import { localDateKey } from '@/lib/local-date';

export function WarmupCard({
  state,
  updateState,
}: {
  state: AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const keys = warmup.map((item) => `${localDateKey()}:${item}`);
  return (
    <section className="warmup-card">
      <button
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="icon-tile">
          <RotateCcw />
        </span>
        <span className="flex-1">
          <strong className="block">Calentamiento rápido</strong>
          <small className="text-muted-foreground">
            {keys.filter((key) => state.warmupDone.includes(key)).length}/
            {warmup.length} completado
          </small>
        </span>
        <ChevronRight
          className={`text-muted-foreground transition ${open ? 'rotate-90' : ''}`}
        />
      </button>
      <AnimatedDisclosure id={panelId} open={open}>
        <div className="space-y-1 border-t border-border p-3">
          {warmup.map((item, index) => {
            const key = keys[index];
            return (
              <label
                key={item}
                className="flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-muted"
              >
                <Checkbox
                  checked={state.warmupDone.includes(key)}
                  onCheckedChange={(checked) =>
                    updateState((current) => ({
                      ...current,
                      warmupDone: checked
                        ? [
                            ...current.warmupDone.filter(
                              (done) => done !== key,
                            ),
                            key,
                          ]
                        : current.warmupDone.filter((done) => done !== key),
                    }))
                  }
                />
                <span className="text-sm font-medium">{item}</span>
              </label>
            );
          })}
        </div>
      </AnimatedDisclosure>
    </section>
  );
}
