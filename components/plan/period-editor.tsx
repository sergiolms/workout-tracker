'use client';
import type { PlanEditor } from '@/hooks/use-plan-editor';
import { Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Stepper } from '@/components/number-stepper';
export function PlanPeriodEditor({ editor }: { editor: PlanEditor }) {
  const {
    state,
    savePeriod,
    deletePeriod,
    periodDraft,
    setPeriodDraft,
    confirmDeletePeriod,
    setConfirmDeletePeriod,
  } = editor;
  return (
    <>
      {periodDraft ? (
        <section className="mb-4 rounded-2xl border border-primary/40 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">
              {state.periods.some((period) => period.id === periodDraft.id)
                ? 'Editar tramo'
                : 'Nuevo tramo'}
            </h2>
            <Button
              aria-label="Cancelar"
              className="size-10 rounded-xl"
              onClick={() => setPeriodDraft(null)}
              size="icon"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
          <label className="block">
            <span className="control-label">Nombre del tramo</span>
            <input
              aria-label="Nombre del tramo"
              className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3"
              onChange={(event) =>
                setPeriodDraft((current) =>
                  current ? { ...current, name: event.target.value } : current,
                )
              }
              placeholder="Ej. Base general"
              value={periodDraft.name}
            />
          </label>
          <div className="mt-4 grid grid-cols-2 items-center gap-3">
            <fieldset>
              <legend className="control-label">Duración (semanas)</legend>
              <Stepper
                label="Duración en semanas"
                value={periodDraft.durationWeeks}
                min={1}
                onChange={(value) =>
                  setPeriodDraft((current) =>
                    current
                      ? { ...current, durationWeeks: Math.min(52, value) }
                      : current,
                  )
                }
              />
            </fieldset>
            <div className="mt-5 flex min-h-12 items-center gap-2 text-sm font-medium">
              <Checkbox
                id="period-deload"
                checked={Boolean(periodDraft.deload)}
                onCheckedChange={(checked) =>
                  setPeriodDraft((current) =>
                    current
                      ? { ...current, deload: Boolean(checked) }
                      : current,
                  )
                }
              />
              <label htmlFor="period-deload">Descarga</label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {state.periods.some((period) => period.id === periodDraft.id) ? (
              <Button
                className="h-12 flex-1 rounded-xl text-red-700 hover:bg-red-500/10 dark:text-red-300"
                onClick={() => setConfirmDeletePeriod(true)}
                variant="outline"
              >
                <Trash2 /> Eliminar
              </Button>
            ) : null}
            <Button
              className="h-12 flex-1 rounded-xl font-bold"
              disabled={
                !periodDraft.name.trim() || periodDraft.durationWeeks < 1
              }
              onClick={savePeriod}
            >
              <Save /> Guardar tramo
            </Button>
          </div>
        </section>
      ) : null}

      <Dialog open={confirmDeletePeriod} onOpenChange={setConfirmDeletePeriod}>
        <DialogContent>
          <DialogTitle>¿Eliminar este tramo?</DialogTitle>
          <DialogDescription>
            Se quitarán sus semanas de la estructura del plan. El historial de
            entrenamientos y las sesiones guardadas no se borrarán.
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              onClick={() => setConfirmDeletePeriod(false)}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:brightness-95"
              onClick={deletePeriod}
            >
              Eliminar tramo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
