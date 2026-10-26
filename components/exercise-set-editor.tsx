'use client';

import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PlateCalculator } from '@/components/exercises/plate-calculator';
import { Stepper } from '@/components/number-stepper';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GhostPerformance } from '@/components/workout-feedback';
import { duplicateSet, setLoad, workingSets } from '@/lib/exercise-sets';
import type { ExerciseLog, SetLog } from '@/lib/storage';
import { loadLabel } from '@/lib/exercise-identity';

export function ExerciseSetEditor({
  sets,
  load,
  unit = 'kg',
  previous,
  onChange,
  onComplete,
  disabled = false,
  name,
  mode = 'reps',
  loadKind,
  barbell = false,
}: {
  sets: SetLog[];
  load: number;
  unit?: string;
  previous?: ExerciseLog;
  onChange: (sets: SetLog[]) => void;
  onComplete?: (sets: SetLog[], index: number) => void;
  disabled?: boolean;
  name?: string;
  mode?: 'reps' | 'time';
  loadKind?: ExerciseLog['loadKind'];
  barbell?: boolean;
}) {
  const [calculatorLoad, setCalculatorLoad] = useState<number | null>(null);
  let workIndex = 0;
  let warmupIndex = 0;
  return (
    <fieldset
      disabled={disabled}
      className="min-w-0"
      aria-label={name ? `Series de ${name}` : 'Series del ejercicio'}
    >
      <div
        className="set-editor-columns set-editor-heading"
        data-bodyweight={unit === 'reps'}
      >
        <span>Serie</span>
        {unit !== 'reps' ? (
          <span>{loadKind === 'assistance' ? 'Ayuda' : 'Carga'}</span>
        ) : null}
        <span>{mode === 'time' ? 'Seg.' : 'Rep.'}</span>
        <span>Hecho</span>
      </div>
      {sets.map((set, index) => {
        const number = set.kind === 'warmup' ? null : workIndex++;
        const short =
          number === null ? `A${++warmupIndex}` : String(number + 1);
        const title =
          number === null
            ? `aproximación ${warmupIndex}`
            : `serie ${number + 1}`;
        const old =
          number === null
            ? undefined
            : previous
              ? workingSets(previous.sets)[number]
              : undefined;
        const patch = (changes: Partial<SetLog>) =>
          onChange(
            sets.map((item, i) =>
              i === index ? { ...item, ...changes } : item,
            ),
          );
        return (
          <div
            key={index}
            className="set-editor-row completion-row"
            data-complete={set.done}
          >
            <div
              className="set-editor-columns"
              data-bodyweight={unit === 'reps'}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Opciones de ${title}`}
                  render={
                    <Button
                      disabled={disabled}
                      variant="ghost"
                      className="h-12 w-11 gap-0.5 px-0 text-sm tabular-nums"
                    />
                  }
                >
                  <span>{short}</span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {barbell &&
                  unit === 'kg' &&
                  (!loadKind || loadKind === 'total') ? (
                    <DropdownMenuItem
                      className="min-h-11"
                      onClick={() => setCalculatorLoad(set.load ?? load)}
                    >
                      Calcular discos
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    className="min-h-11"
                    onClick={() => onChange(duplicateSet(sets, index))}
                  >
                    Duplicar {title}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="min-h-11"
                    disabled={
                      set.kind !== 'warmup' && workingSets(sets).length <= 1
                    }
                    onClick={() =>
                      patch({ kind: set.kind === 'warmup' ? 'work' : 'warmup' })
                    }
                  >
                    {set.kind === 'warmup'
                      ? 'Pasar a serie de trabajo'
                      : 'Pasar a aproximación'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="min-h-11"
                    variant="destructive"
                    disabled={
                      sets.length <= 1 ||
                      (set.kind !== 'warmup' && workingSets(sets).length <= 1)
                    }
                    onClick={() => onChange(sets.filter((_, i) => i !== index))}
                  >
                    <Trash2 /> Quitar {title}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {unit !== 'reps' ? (
                <div className="min-w-0">
                  <Stepper
                    compact
                    label={`${loadLabel(loadKind, unit)}, ${title}`}
                    step={0.5}
                    suffix={unit}
                    value={set.load ?? load}
                    onChange={(value) => patch({ load: value })}
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <Stepper
                  compact
                  label={`${mode === 'time' ? 'Segundos' : 'Repeticiones'}, ${title}`}
                  value={mode === 'time' ? (set.seconds ?? 0) : set.reps}
                  step={mode === 'time' ? 5 : 1}
                  max={mode === 'time' ? 86400 : 999}
                  onChange={(value) =>
                    patch(
                      mode === 'time' ? { seconds: value } : { reps: value },
                    )
                  }
                />
              </div>
              <Checkbox
                aria-label={`${number === null ? `Aproximación ${warmupIndex}` : `Serie ${number + 1}`} hecha`}
                checked={set.done}
                disabled={disabled}
                className="mb-0.5 size-11 after:inset-0"
                onCheckedChange={(done) => {
                  const next = sets.map((item, i) =>
                    i === index ? { ...item, done: Boolean(done) } : item,
                  );
                  if (onComplete) onComplete(next, index);
                  else onChange(next);
                }}
              />
            </div>
            {old?.done &&
            previous &&
            mode !== 'time' &&
            loadKind !== 'assistance' ? (
              <div className="mt-2">
                <GhostPerformance
                  load={unit === 'reps' ? 0 : (set.load ?? load)}
                  reps={set.reps}
                  previousLoad={unit === 'reps' ? 0 : setLoad(old, previous)}
                  previousReps={old.reps}
                  unit={unit === 'reps' ? '' : unit}
                />
              </div>
            ) : null}
            {set.rpe !== undefined ||
            set.distanceKm !== undefined ||
            set.supersetId ||
            (set.sourceType &&
              !['normal', 'warmup'].includes(set.sourceType)) ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {[
                  set.rpe !== undefined
                    ? `Esfuerzo original RPE ${set.rpe}/10`
                    : '',
                  set.distanceKm !== undefined ? `${set.distanceKm} km` : '',
                  set.supersetId ? `Superserie ${set.supersetId}` : '',
                  set.sourceType &&
                  !['normal', 'warmup'].includes(set.sourceType)
                    ? `Tipo original: ${set.sourceType}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        );
      })}
      <p className="mt-2 text-xs text-muted-foreground">
        Toca una cifra para editarla.
        {sets.some((set) => set.kind === 'warmup') ? ' A: aproximación.' : ''}
      </p>
      {loadKind === 'perHand' ||
      loadKind === 'added' ||
      loadKind === 'assistance' ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Carga en {loadLabel(loadKind, unit)}.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          className="min-h-11 px-2 text-xs"
          onClick={() =>
            onChange([
              ...sets,
              {
                reps: workingSets(sets).at(-1)?.reps ?? 10,
                load,
                done: false,
                kind: 'work',
                ...(mode === 'time'
                  ? { seconds: sets.at(-1)?.seconds ?? 30, reps: 0 }
                  : {}),
              },
            ])
          }
        >
          <Plus className="size-4" /> Serie
        </Button>
        <Button
          variant="ghost"
          className="min-h-11 px-2 text-xs text-muted-foreground"
          onClick={() =>
            onChange([
              {
                reps: mode === 'time' ? 0 : 8,
                ...(mode === 'time' ? { seconds: 15 } : {}),
                load: 0,
                done: false,
                kind: 'warmup',
              },
              ...sets,
            ])
          }
        >
          <Plus className="size-4" /> Aproximación
        </Button>
      </div>
      {calculatorLoad !== null ? (
        <PlateCalculator
          load={calculatorLoad}
          onClose={() => setCalculatorLoad(null)}
        />
      ) : null}
    </fieldset>
  );
}
