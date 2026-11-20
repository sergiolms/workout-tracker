'use client';
import { useMemo, useState } from 'react';
import type { TodaySession } from '@/hooks/use-today-session';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExerciseSearchField } from '@/components/exercises/exercise-search-field';
import {
  getExerciseDisplayName,
  searchCatalog,
  type CatalogExercise,
} from '@/lib/exercise-catalog';
import { appendCatalogExercises } from '@/lib/session-exercises';
import { replaceWorkoutExercise, startWorkout } from '@/lib/workout-instance';

export function ReplaceExercise({ session }: { session: TodaySession }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogExercise | null>(null);
  const results = useMemo(
    () =>
      searchCatalog(query).filter(
        (item) =>
          !session.sessionExercises.some(
            (e) => e.catalogId === item.id || e.name === item.name,
          ),
      ),
    [query, session.sessionExercises],
  );
  const replace = (item: CatalogExercise) => {
    const replacement = appendCatalogExercises([], [item])[0];
    session.updateState((current) =>
      replaceWorkoutExercise(
        startWorkout(current, {
          id: session.workoutId,
          week: current.week,
          routine: session.routineId,
          date: session.day,
          startedAt: new Date().toISOString(),
        }),
        session.workoutId,
        session.exerciseIndex,
        replacement,
      ),
    );
    session.onStopRest();
    setOpen(false);
    setSelected(null);
    setQuery('');
  };
  return (
    <>
      <Button
        variant="outline"
        className="mb-3 min-h-11"
        disabled={!session.editable}
        onClick={() => setOpen(true)}
      >
        Reemplazar solo en esta sesión
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle>Reemplazar ejercicio</DialogTitle>
          <DialogDescription>
            El cambio solo afecta a este entrenamiento. Tu rutina del plan
            conserva el ejercicio original.
          </DialogDescription>
          {selected ? (
            <>
              <p>
                Se sustituirá por{' '}
                {getExerciseDisplayName(selected.name, selected.id)}. Se
                descartarán las series y notas del ejercicio que reemplazas.
              </p>
              <Button onClick={() => replace(selected)}>
                Confirmar reemplazo
              </Button>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Volver
              </Button>
            </>
          ) : (
            <>
              <ExerciseSearchField value={query} onChange={setQuery} />
              <div className="max-h-[45dvh] overflow-y-auto">
                {results.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="h-auto min-h-12 w-full justify-start whitespace-normal text-left"
                    onClick={() =>
                      session.currentLog ? setSelected(item) : replace(item)
                    }
                  >
                    {getExerciseDisplayName(item.name, item.id)}
                  </Button>
                ))}
                {!results.length ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    No hay ejercicios que coincidan.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
