'use client';

import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { AppState, Measurement } from '@/lib/storage';

type MetricKey = 'weight' | 'waist';
const formatValue = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value);
const formatDate = (date: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
const dateInputValue = (date: string) => { const value = new Date(date); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; };

function MeasurementChart({ entries, metric, label, unit }: { entries: Measurement[]; metric: MetricKey; label: string; unit: string }) {
  const points = entries
    .filter((entry) => typeof entry[metric] === 'number' && Number.isFinite(entry[metric]) && Number(entry[metric]) > 0 && !Number.isNaN(new Date(entry.date).getTime()))
    .map((entry) => ({ date: new Date(entry.date).getTime(), value: Number(entry[metric]) }))
    .sort((a, b) => a.date - b.date);
  const latest = points.at(-1);
  const earliest = points[0];
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padding = Math.max(1, (high - low) * 0.2);
  const minY = low - padding;
  const maxY = high + padding;
  const firstTime = earliest?.date ?? 0;
  const span = (latest?.date ?? 0) - firstTime;
  const coords = points.map((point, index) => ({
    x: points.length === 1 ? 150 : span ? 16 + ((point.date - firstTime) / span) * 268 : 16 + (index / (points.length - 1)) * 268,
    y: 112 - ((point.value - minY) / (maxY - minY)) * 96,
  }));
  const line = coords.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area = coords.length > 1 ? `${line} L ${coords.at(-1)?.x} 112 L ${coords[0].x} 112 Z` : '';

  return <div className="rounded-xl border border-border bg-background p-4">
    <div className="flex items-baseline justify-between gap-2"><h3 className="text-sm font-semibold">{label}</h3><p className="text-xl font-bold tabular-nums">{latest ? `${formatValue(latest.value)} ${unit}` : 'Sin datos'}</p></div>
    {latest ? <>
      <svg aria-label={`Evolución de ${label.toLowerCase()}: ${points.length} ${points.length === 1 ? 'medida' : 'medidas'}, última ${formatValue(latest.value)} ${unit}`} className="mt-3 h-32 w-full text-primary" role="img" viewBox="0 0 300 130">
        <title>Evolución de {label.toLowerCase()}</title>
        {[16, 64, 112].map((y) => <line key={y} opacity="0.15" stroke="currentColor" strokeDasharray="3 4" x1="16" x2="284" y1={y} y2={y} />)}
        {area ? <path d={area} fill="currentColor" opacity="0.10" /> : null}
        {line ? <path d={line} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /> : null}
        {coords.map((point, index) => <circle key={`${points[index].date}-${index}`} cx={point.x} cy={point.y} fill="currentColor" r={index === coords.length - 1 ? 4.5 : 3} stroke="var(--background)" strokeWidth="2" />)}
      </svg>
      <div className="flex justify-between gap-2 text-xs text-muted-foreground"><span>{formatDate(new Date(firstTime).toISOString())}</span><span>{points.length} {points.length === 1 ? 'medida' : 'medidas'}</span>{points.length > 1 ? <span>{formatDate(new Date(latest.date).toISOString())}</span> : null}</div>
    </> : <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Añade una medida para empezar a ver la evolución.</p>}
  </div>;
}

export function MeasurementTracker({ state, updateState }: { state: AppState; updateState: (updater: (state: AppState) => AppState) => void }) {
  const entries = state.measurements.filter((entry) => typeof entry.weight === 'number' || typeof entry.waist === 'number').sort((a, b) => b.date.localeCompare(a.date));
  const [editing, setEditing] = useState<Measurement | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Measurement | null>(null);
  const [date, setDate] = useState('');
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [showAll, setShowAll] = useState(false);
  const weightNumber = weight.trim() ? Number(weight) : undefined;
  const waistNumber = waist.trim() ? Number(waist) : undefined;
  const valid = Boolean(date && date <= dateInputValue(new Date().toISOString()) && !Number.isNaN(new Date(`${date}T12:00:00`).getTime()) && [weightNumber, waistNumber].some((value) => value !== undefined && Number.isFinite(value) && value > 0) && [weightNumber, waistNumber].every((value) => value === undefined || Number.isFinite(value) && value > 0));

  const openEditor = (entry?: Measurement) => {
    setEditing(entry ?? 'new');
    setDate(entry ? dateInputValue(entry.date) : dateInputValue(new Date().toISOString()));
    setWeight(entry?.weight == null ? '' : String(entry.weight));
    setWaist(entry?.waist == null ? '' : String(entry.waist));
  };
  const save = () => {
    if (!valid || !editing) return;
    const original = editing === 'new' ? null : editing;
    const next: Measurement = { ...original, id: original?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: new Date(`${date}T12:00:00`).toISOString() };
    if (weightNumber === undefined) delete next.weight; else next.weight = weightNumber;
    if (waistNumber === undefined) delete next.waist; else next.waist = waistNumber;
    updateState((current) => ({ ...current, measurements: original ? current.measurements.map((entry) => entry.id === original.id ? next : entry) : [...current.measurements, next] }));
    setEditing(null);
  };

  return <section className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-bold">Peso y cintura</h2><p className="mt-1 text-xs text-muted-foreground">Evolución de tus medidas registradas</p></div><Button className="min-h-11 shrink-0 rounded-xl px-3" onClick={() => openEditor()}><Plus className="size-4" /> Añadir</Button></div>
    <div className="grid gap-3 sm:grid-cols-2"><MeasurementChart entries={entries} label="Peso" metric="weight" unit="kg" /><MeasurementChart entries={entries} label="Cintura" metric="waist" unit="cm" /></div>
    {entries.length ? <div className="mt-5"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold">Historial de medidas</h3><span className="text-xs text-muted-foreground">{entries.length} registros</span></div><div className="divide-y divide-border rounded-xl border border-border">{(showAll ? entries : entries.slice(0, 5)).map((entry) => <div key={entry.id} className="flex min-h-16 items-center gap-2 px-3 py-2"><div className="min-w-0 flex-1"><strong className="block text-sm">{formatDate(entry.date)}</strong><span className="block text-xs text-muted-foreground">{typeof entry.weight === 'number' ? `${formatValue(entry.weight)} kg` : 'Peso —'} · {typeof entry.waist === 'number' ? `${formatValue(entry.waist)} cm` : 'Cintura —'}</span></div><Button aria-label={`Editar medida del ${formatDate(entry.date)}`} className="size-11 shrink-0 rounded-xl" onClick={() => openEditor(entry)} size="icon" variant="ghost"><Pencil className="size-4" /></Button></div>)}</div>{entries.length > 5 ? <Button className="mt-2 min-h-11 w-full rounded-xl" onClick={() => setShowAll((value) => !value)} variant="ghost">{showAll ? 'Mostrar menos' : `Ver todas (${entries.length})`}</Button> : null}</div> : null}
    <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}><DialogContent><DialogTitle>{editing === 'new' ? 'Añadir medida' : 'Editar medida'}</DialogTitle><DialogDescription>Registra peso, cintura o ambos. Puedes corregir la fecha y los valores más tarde.</DialogDescription><div className="mt-4 space-y-3"><label className="block"><span className="control-label">Fecha</span><input aria-label="Fecha de la medida" className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3" max={dateInputValue(new Date().toISOString())} onChange={(event) => setDate(event.target.value)} type="date" value={date} /></label><div className="grid grid-cols-2 gap-3"><label><span className="control-label">Peso (kg)</span><input aria-label="Peso en kilogramos" className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base" inputMode="decimal" min="0.1" onChange={(event) => setWeight(event.target.value)} placeholder="Opcional" step="0.1" type="number" value={weight} /></label><label><span className="control-label">Cintura (cm)</span><input aria-label="Cintura en centímetros" className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base" inputMode="decimal" min="0.1" onChange={(event) => setWaist(event.target.value)} placeholder="Opcional" step="0.1" type="number" value={waist} /></label></div></div><Button className="mt-4 h-12 w-full rounded-xl font-bold" disabled={!valid} onClick={save}><Check className="size-4" /> Guardar medida</Button>{editing && editing !== 'new' ? <Button className="mt-2 h-11 w-full rounded-xl text-red-700 dark:text-red-300" onClick={() => { setDeleting(editing); setEditing(null); }} variant="ghost"><Trash2 className="size-4" /> Eliminar registro</Button> : null}</DialogContent></Dialog>
    <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}><DialogContent><DialogTitle>¿Eliminar esta medida?</DialogTitle><DialogDescription>El registro del {deleting ? formatDate(deleting.date) : ''} desaparecerá de las gráficas y del historial. No se puede deshacer.</DialogDescription><div className="mt-4 flex justify-end gap-2"><Button onClick={() => setDeleting(null)} variant="outline">Cancelar</Button><Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => { if (deleting) updateState((current) => ({ ...current, measurements: current.measurements.filter((entry) => entry.id !== deleting.id) })); setDeleting(null); }}><Trash2 className="size-4" /> Eliminar</Button></div></DialogContent></Dialog>
  </section>;
}
