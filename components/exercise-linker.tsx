'use client';
import { useDeferredValue, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExerciseThumbnail } from '@/components/exercises/exercise-thumbnail';
import { ExerciseSearchField } from '@/components/exercises/exercise-search-field';
import { ProgressiveExerciseList } from '@/components/exercises/progressive-exercise-list';
import {
  exerciseCatalogSections,
  getExerciseDisplayName,
} from '@/lib/exercise-catalog';

export function ExerciseLinker({
  name,
  onLink,
}: {
  name: string;
  onLink: (catalogId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(name);
  const deferred = useDeferredValue(query);
  const results = useMemo(
    () => exerciseCatalogSections(deferred).flatMap((section) => section.items),
    [deferred],
  );
  return (
    <>
      <Button
        variant="outline"
        className="min-h-11"
        onClick={() => setOpen(true)}
      >
        Vincular al catálogo
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(85dvh,720px)] max-h-[90dvh] flex-col overflow-hidden">
          <DialogTitle>Identificar ejercicio</DialogTitle>
          <DialogDescription>
            Elige una coincidencia exacta de movimiento y material. Se
            conservará el nombre original del registro.
          </DialogDescription>
          <div className="shrink-0">
            <ExerciseSearchField value={query} onChange={setQuery} />
          </div>
          {open ? (
            <ProgressiveExerciseList
              key={deferred}
              items={results}
              getKey={(item) => item.id}
              label="Ejercicios del catálogo"
              busy={query !== deferred}
              renderItem={(item) => (
                <button
                  className="flex min-h-16 w-full items-center gap-3 border-b border-border py-2 text-left"
                  type="button"
                  onClick={() => {
                    onLink(item.id);
                    setOpen(false);
                  }}
                >
                  <ExerciseThumbnail
                    image={item.image}
                    name={getExerciseDisplayName(item.name, item.id)}
                  />
                  <span>{getExerciseDisplayName(item.name, item.id)}</span>
                </button>
              )}
            />
          ) : null}
          {!results.length ? (
            <output>
              No hay coincidencias. Puedes conservar el ejercicio sin vincular.
            </output>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
