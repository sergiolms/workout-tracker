'use client';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExerciseThumbnail, exerciseVisual } from './exercise-thumbnail';
import { getExerciseDisplayName } from '@/lib/exercise-catalog';
import {
  historyExerciseKey,
  type HistoryExercise,
} from '@/lib/exercise-history';
import { searchHistoryExercises } from '@/lib/history-exercise-search';
import { loadLabel } from '@/lib/exercise-identity';
import type { AppState } from '@/lib/storage';

import { ExerciseSearchField } from './exercise-search-field';
import { ProgressiveExerciseList } from './progressive-exercise-list';
const label = (exercise: HistoryExercise) =>
  getExerciseDisplayName(exercise.name, exercise.catalogId);
const detail = (exercise: HistoryExercise) =>
  exercise.mode === 'time'
    ? 'Segundos'
    : exercise.unit === 'reps'
      ? 'Peso corporal'
      : loadLabel(exercise.loadKind, exercise.unit ?? 'kg');
const image = (state: AppState, exercise: HistoryExercise) =>
  exerciseVisual(
    state,
    exercise.name,
    exercise.id ??
      (exercise.catalogId ? `catalog:${exercise.catalogId}` : undefined),
  );

export function ExerciseHistoryPicker({
  state,
  exercises,
  selected,
  onSelect,
}: {
  state: AppState;
  exercises: HistoryExercise[];
  selected: HistoryExercise;
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const input = useRef<HTMLInputElement>(null);
  const choices = useMemo(
    () =>
      exercises.map((exercise) => ({
        value: exercise,
        label: label(exercise),
        originalName: exercise.name,
      })),
    [exercises],
  );
  const results = useMemo(
    () =>
      searchHistoryExercises(choices, deferredQuery).map(
        (choice) => choice.value,
      ),
    [choices, deferredQuery],
  );
  const choose = (key: string) => {
    onSelect(key);
    setOpen(false);
  };
  return (
    <>
      <Button
        aria-label={`Cambiar ejercicio: ${label(selected)}`}
        className="min-h-20 w-full justify-start gap-3 whitespace-normal px-3 py-2 text-left"
        variant="outline"
        onClick={() => {
          setQuery('');
          setOpen(true);
        }}
      >
        <ExerciseThumbnail
          name={label(selected)}
          image={image(state, selected)}
        />
        <span className="min-w-0 flex-1">
          <strong className="block break-words">{label(selected)}</strong>
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            {detail(selected)} · cambiar ejercicio
          </span>
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(85dvh,720px)] max-h-[90dvh] min-w-0 flex-col overflow-hidden sm:max-w-lg">
          <div className="shrink-0 pr-8">
            <DialogTitle>Elegir ejercicio</DialogTitle>
            <DialogDescription className="mt-2">
              Busca entre los ejercicios de tu historial.
            </DialogDescription>
          </div>
          <div className="shrink-0">
            <ExerciseSearchField
              value={query}
              onChange={setQuery}
              inputRef={input}
            />
          </div>
          {open ? (
            <HistoryResults
              key={deferredQuery}
              state={state}
              results={results}
              selected={selected}
              busy={query !== deferredQuery}
              onSelect={choose}
              onClear={() => {
                setQuery('');
                input.current?.focus();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function HistoryResults({
  state,
  results,
  selected,
  busy,
  onSelect,
  onClear,
}: {
  state: AppState;
  results: HistoryExercise[];
  selected: HistoryExercise;
  busy: boolean;
  onSelect: (key: string) => void;
  onClear: () => void;
}) {
  return (
    <>
      <ProgressiveExerciseList
        items={results}
        getKey={historyExerciseKey}
        label="Ejercicios del historial"
        busy={busy}
        renderItem={(exercise) => {
          const current =
            historyExerciseKey(exercise) === historyExerciseKey(selected);
          return (
            <button
              type="button"
              aria-current={current ? 'true' : undefined}
              className={`flex min-h-20 w-full items-center gap-3 border-b border-border px-2 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring ${current ? 'bg-muted' : ''}`}
              onClick={() => onSelect(historyExerciseKey(exercise))}
            >
              <ExerciseThumbnail
                name={label(exercise)}
                image={image(state, exercise)}
              />
              <span className="min-w-0 flex-1">
                <strong className="block break-words text-sm">
                  {label(exercise)}
                </strong>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {detail(exercise)}
                </span>
              </span>
              {current ? (
                <Check
                  aria-label="Seleccionado"
                  className="size-5 shrink-0 text-primary"
                />
              ) : null}
            </button>
          );
        }}
      />
      {!results.length ? (
        <div className="py-6 text-center">
          <p className="text-sm font-medium">No hay coincidencias</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Prueba con menos palabras o con el nombre original del ejercicio.
          </p>
          <Button variant="outline" className="mt-4 min-h-11" onClick={onClear}>
            Ver todos mis ejercicios
          </Button>
        </div>
      ) : null}
    </>
  );
}
