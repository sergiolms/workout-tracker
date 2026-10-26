'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Pencil, Search, Trash2, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { historyPage } from '@/lib/history-browser';
import { activityEstimates, formatPace } from '@/lib/activity-estimates';
import type { CardioLog, WorkoutLog } from '@/lib/storage';

const dateLabel = (date: string) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(date));

export function WorkoutHistoryEntry({ workout, onEdit, onDelete }: { workout: WorkoutLog; onEdit?: () => void; onDelete?: () => void }) {
  const completed = workout.exercises.filter(item => item.status === 'done').length;
  const partial = workout.exercises.filter(item => item.status === 'partial').length;
  return <details className="history-entry rounded-xl border border-border bg-background"><summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-3"><Dumbbell className="size-5 shrink-0 text-primary" /><span className="min-w-0 flex-1"><strong className="block break-words text-sm">{workout.routineName}</strong><small className="text-muted-foreground">{dateLabel(workout.date)} · {workout.source === 'hevy' ? 'Importado de Hevy' : `Semana ${workout.week}`}</small></span><span className="shrink-0 text-right text-xs text-muted-foreground">{completed}/{workout.exercises.length}<small className="block">hechos{partial ? ` · ${partial} parciales` : ''}</small></span><ChevronRight className="history-chevron size-4 shrink-0 text-muted-foreground" /></summary><div className="space-y-3 border-t border-border p-3"><ul className="space-y-2">{workout.exercises.map(item => <li key={item.name} className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm"><span className="min-w-0 flex-1">{item.name}</span><span className="text-xs text-muted-foreground">{item.status === 'done' ? 'Completado' : item.status === 'partial' ? 'Parcial' : item.status === 'skipped' ? 'No completado' : 'Pendiente'}</span></li>)}</ul>{workout.notes ? <p className="rounded-lg bg-muted p-3 text-sm">{workout.notes}</p> : null}<EntryActions onEdit={onEdit} onDelete={onDelete} /></div></details>;
}

export function ActivityHistoryEntry({ activity, onEdit, onDelete }: { activity: CardioLog; onEdit?: () => void; onDelete?: () => void }) {
  const estimate = activityEstimates(activity.minutes, activity.distance ?? 0);
  return <details className="history-entry rounded-xl border border-border bg-background"><summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-3"><Wind className="size-5 shrink-0 text-primary" /><span className="min-w-0 flex-1"><strong className="block text-sm">{activity.type}</strong><small className="text-muted-foreground">{dateLabel(activity.date)}</small></span><span className="shrink-0 text-sm font-semibold tabular-nums">{activity.minutes} min</span><ChevronRight className="history-chevron size-4 shrink-0 text-muted-foreground" /></summary><div className="space-y-3 border-t border-border p-3"><div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">{activity.distance ? <><span>{activity.distance} km</span><span>{formatPace(estimate.paceSeconds)} min/km</span></> : null}{activity.steps ? <span>{activity.steps.toLocaleString('es-ES')} pasos{activity.stepsEstimated ? ' estimados' : ''}</span> : null}{activity.rpe ? <span>Esfuerzo {activity.rpe}/10</span> : null}{activity.heartRate ? <span>{activity.heartRate} bpm</span> : null}</div><EntryActions onEdit={onEdit} onDelete={onDelete} /></div></details>;
}

function EntryActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  if (!onEdit && !onDelete) return null;
  return <div className="flex gap-2 border-t border-border pt-3">{onEdit ? <Button className="min-h-11 flex-1 rounded-xl" onClick={onEdit} variant="outline"><Pencil className="size-4" /> Editar</Button> : null}{onDelete ? <Button className="min-h-11 rounded-xl text-red-700 dark:text-red-300" onClick={onDelete} variant="outline"><Trash2 className="size-4" /> Borrar</Button> : null}</div>;
}

export function HistoryBrowser<T extends { id: string; date: string }>({ title, entries, searchText, renderEntry }: { title: string; entries: T[]; searchText: (entry: T) => string; renderEntry: (entry: T) => ReactNode }) {
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(0);
  const result = useMemo(() => historyPage(entries, { query, month, page, searchText }), [entries, query, month, page, searchText]);
  return <section className="journal-section mt-4" aria-label={title}>
    <div className="mb-4 flex items-baseline justify-between gap-3"><h2 className="font-semibold">{title}</h2><span className="text-sm tabular-nums text-muted-foreground">{entries.length}</span></div>
    {entries.length ? <><div className="mb-3 flex flex-wrap gap-2"><label className="flex min-w-0 flex-[2_1_150px] items-center gap-2 rounded-xl border border-border bg-background px-3"><Search className="size-4 shrink-0 text-muted-foreground" /><input aria-label={`Buscar en ${title.toLowerCase()}`} className="h-11 min-w-0 w-full bg-transparent text-base outline-none" placeholder="Buscar…" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label><select aria-label={`Mes de ${title.toLowerCase()}`} className="h-11 min-w-0 flex-[1_1_130px] rounded-xl border border-border bg-background px-3 text-sm" value={month} onChange={event => { setMonth(event.target.value); setPage(0); }}><option value="">Todos los meses</option>{result.months.map(value => <option key={value} value={value}>{new Date(`${value}-15T12:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</option>)}</select></div>
      <div key={`${query}:${month}:${result.page}`} className="space-y-2">{result.entries.map(entry => <div key={entry.id}>{renderEntry(entry)}</div>)}</div>
      {!result.total ? <p className="py-4 text-sm text-muted-foreground">No hay registros con esta búsqueda y este mes.</p> : null}
      <div className="mt-4 flex items-center justify-between gap-2"><p aria-live="polite" className="text-xs text-muted-foreground">{result.start}–{result.end} de {result.total}</p><div className="flex items-center gap-1"><Button aria-label={`Página anterior de ${title.toLowerCase()}`} variant="ghost" className="size-11 rounded-xl" size="icon" disabled={!result.page} onClick={() => setPage(result.page - 1)}><ChevronLeft /></Button><span className="text-xs tabular-nums">{result.page + 1}/{result.pages}</span><Button aria-label={`Página siguiente de ${title.toLowerCase()}`} variant="ghost" className="size-11 rounded-xl" size="icon" disabled={result.page >= result.pages - 1} onClick={() => setPage(result.page + 1)}><ChevronRight /></Button></div></div>
    </> : <p className="py-3 text-sm text-muted-foreground">Tus registros aparecerán aquí cuando guardes una actividad.</p>}
  </section>;
}
