'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { weekInterval, weeklyVolume } from '@/lib/training-volume';
import {
  getExerciseDetails,
  getExerciseDisplayName,
} from '@/lib/exercise-catalog';
import { bodyPartOptions } from '@/lib/catalog-filters';
import type { AppState } from '@/lib/storage';
import { exerciseIdentity } from '@/lib/exercise-identity';
import {
  HistoryLoading,
  monthsBetween,
  useHistoryMonths,
} from '@/components/history-source';

export function WeeklyTrainingVolume({ state }: { state: AppState }) {
  const [offset, setOffset] = useState(0);
  const [today] = useState(() => new Date());
  const { start, end } = weekInterval(today, offset);
  const status = useHistoryMonths(state, monthsBetween(start, end));
  const startTime = start.getTime(),
    endTime = Math.min(end.getTime(), today.getTime() + 1);
  const templates = state.sessions.flatMap((session) => session.exercises);
  const byIdentity = new Map(
    templates.map((exercise) => [exerciseIdentity(exercise), exercise]),
  );
  const byName = new Map(
    templates.map((exercise) => [exercise.name, exercise]),
  );
  const summary = weeklyVolume(state, startTime, endTime, (log) => {
    const template = log.exerciseId
      ? byIdentity.get(log.exerciseId)
      : byName.get(log.exercise);
    const id = log.exerciseId?.startsWith('catalog:')
      ? log.exerciseId.slice(8)
      : template?.catalogId;
    if (!id) return 'Sin zona asignada';
    const bodyPart = getExerciseDetails('', id)?.bodyPart;
    return (
      bodyPartOptions.find(([key]) => key === bodyPart)?.[1] ??
      'Sin zona asignada'
    );
  });
  const label = (date: Date) =>
    date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const lastDay = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() - 1,
  );
  return (
    <section className="journal-section mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Series esta semana</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="size-11"
            aria-label="Semana anterior de volumen"
            onClick={() => setOffset((value) => value - 1)}
          >
            ←
          </Button>
          <span className="text-sm tabular-nums">
            {label(start)} – {label(lastDay)}
          </span>
          <Button
            variant="ghost"
            className="size-11"
            aria-label="Semana siguiente de volumen"
            disabled={offset === 0}
            onClick={() => setOffset((value) => Math.min(0, value + 1))}
          >
            →
          </Button>
        </div>
      </div>
      <HistoryLoading status={status}>
        <p className="my-3 text-sm text-muted-foreground">
          {summary.total} series de trabajo realizadas. Cada serie cuenta una
          vez en la zona principal del catálogo; las aproximaciones no cuentan.
        </p>
        {summary.groups.length ? (
          <ul>
            {summary.groups.map(([name, count]) => (
              <li
                key={name}
                className="flex justify-between gap-3 border-b border-border py-3 text-sm"
              >
                <span>{name}</span>
                <strong className="tabular-nums">{count}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            No hay series finalizadas en esta semana.
          </p>
        )}
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
            Ver por ejercicio
          </summary>
          <ul>
            {summary.exercises.map((exercise) => (
              <li
                key={exercise.id}
                className="flex justify-between gap-3 py-2 text-sm"
              >
                <span>{getExerciseDisplayName(exercise.name)}</span>
                <span>{exercise.sets}</span>
              </li>
            ))}
          </ul>
        </details>
      </HistoryLoading>
    </section>
  );
}
