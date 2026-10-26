'use client';
import { useMemo, useState } from 'react';
import type { AppState } from '@/lib/storage';
import type { Exercise } from '@/lib/workout-data';
import { exerciseHistory, loggedExercises } from '@/lib/exercise-history';
import { exerciseIdentity } from '@/lib/exercise-identity';
import { getExerciseDisplayName } from '@/lib/exercise-catalog';

const number = (value: number) => value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const day = (date: string) => new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export function ExerciseHistory({ state, exercise, excludeWorkoutId }: { state: AppState; exercise: Pick<Exercise, 'name' | 'id' | 'unit' | 'catalogId'>; excludeWorkoutId?: string }) {
  const [range, setRange] = useState(90);
  const [metric, setMetric] = useState<'load' | 'reps' | 'volume'>('load');
  const [now] = useState(Date.now);
  const all = useMemo(() => exerciseHistory(state, exercise, excludeWorkoutId), [state, exercise, excludeWorkoutId]);
  const rows = all.filter(row => !range || Date.parse(row.date) >= now - range * 86400000);
  const repsOnly = exercise.unit === 'reps';
  const activeMetric = repsOnly ? 'reps' : metric;
  const suffix = activeMetric === 'load' ? exercise.unit ?? 'kg' : activeMetric === 'volume' ? `${exercise.unit ?? 'kg'}·rep` : 'rep';
  const best = all.length ? Math.max(...all.map(row => row[activeMetric])) : 0;
  const points = rows.map(row => row[activeMetric]);
  const low = Math.min(...points), high = Math.max(...points);
  const coords = rows.map((row, index) => ({ x: 24 + index / Math.max(1, rows.length - 1) * 288, y: 112 - (row[activeMetric] - low) / Math.max(1, high - low) * 88 }));
  return <section aria-label="Evolución del ejercicio" className="mt-4">
    <div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm text-muted-foreground">{activeMetric === 'load' ? 'Mayor carga registrada' : activeMetric === 'reps' ? 'Más repeticiones en una serie' : 'Mayor volumen por sesión'}</p><p className="mt-1 text-3xl font-bold tabular-nums">{all.length ? `${number(best)} ${suffix}` : 'Sin registros'}</p></div><label className="text-sm">Periodo<select className="ml-2 h-11 rounded border border-border bg-background px-2" value={range} onChange={event => setRange(Number(event.target.value))}><option value={30}>30 días</option><option value={90}>90 días</option><option value={0}>Todo</option></select></label></div>
    {!repsOnly ? <label className="mt-3 block text-sm">Comparar<select className="ml-2 h-11 rounded border border-border bg-background px-2" value={metric} onChange={event => setMetric(event.target.value as typeof metric)}><option value="load">Carga máxima</option><option value="reps">Repeticiones por serie</option><option value="volume">Volumen realizado</option></select></label> : null}
    {rows.length > 1 ? <svg aria-label={`Evolución de ${rows.length} registros. Datos detallados debajo.`} className="my-4 h-auto max-h-48 w-full text-primary" viewBox="0 0 336 140"><title>Evolución de {exercise.name}</title><text x="24" y="14" fill="var(--muted-foreground)" fontSize="11">{number(high)} {suffix}</text><text x="24" y="136" fill="var(--muted-foreground)" fontSize="11">{number(low)} {suffix}</text><path d={coords.map((point, i) => `${i ? 'L' : 'M'}${point.x},${point.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" />{coords.map((point, i) => <circle key={rows[i].id} cx={point.x} cy={point.y} r="3" fill="currentColor" />)}</svg> : null}
    {rows.length ? <><p className="my-3 text-sm text-muted-foreground">{rows.length} registros en el periodo. La mejor marca usa todo el historial.</p><ol className="mt-3 max-h-96 overflow-y-auto">{rows.toReversed().map(row => <li key={row.id} className="border-b border-border py-3"><div className="flex justify-between gap-2 text-sm"><strong>{day(row.date)}</strong><span className="tabular-nums">{number(row[activeMetric])} {suffix}</span></div><p className="mt-1 text-sm text-muted-foreground">{row.sets.map(set => `${repsOnly ? '' : `${number(set.load ?? row.original.load)} ${exercise.unit ?? 'kg'} × `}${set.reps} rep`).join(' · ')}</p></li>)}</ol></> : <p className="py-5 text-sm text-muted-foreground">Todavía no hay series de trabajo finalizadas en este periodo.</p>}
    {activeMetric === 'volume' ? <p className="mt-3 text-sm text-muted-foreground">Suma de carga × repeticiones de las series realizadas. Compara este ejercicio consigo mismo, usando siempre el mismo criterio de carga.</p> : null}
  </section>;
}

export function ExerciseProgress({ state }: { state: AppState }) {
  const exercises = useMemo(() => loggedExercises(state), [state]);
  const [selected, setSelected] = useState('');
  const exercise = exercises.find(item => exerciseIdentity(item) === selected) ?? exercises[0];
  if (!exercise) return <p className="py-6 text-sm text-muted-foreground">Completa un ejercicio para empezar a ver su evolución.</p>;
  return <div className="journal-section"><label className="block text-sm font-medium">Ejercicio<select className="mt-2 h-12 w-full rounded border border-border bg-background px-3" value={exerciseIdentity(exercise)} onChange={event => setSelected(event.target.value)}>{exercises.map(item => <option key={exerciseIdentity(item)} value={exerciseIdentity(item)}>{getExerciseDisplayName(item.name, item.catalogId)}</option>)}</select></label><ExerciseHistory key={exerciseIdentity(exercise)} state={state} exercise={exercise} /></div>;
}
