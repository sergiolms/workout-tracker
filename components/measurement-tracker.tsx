'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ViewTabs } from '@/components/view-tabs';
import { HistoryBrowser } from '@/components/training-history';
import type { AppState, Measurement } from '@/lib/storage';
import {
  optionalMeasurement,
  validMeasurements,
} from '@/lib/measurement-input';
import { MeasurementForm } from '@/components/measurement-form';
import { moveToTrash } from '@/lib/record-trash';

type MetricKey = 'weight' | 'waist';
const formatValue = (value: number) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value);
const formatDate = (date: string) =>
  new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
const dateInputValue = (date: string) => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

function MeasurementChart({
  entries,
  metric,
  label,
  unit,
}: {
  entries: Measurement[];
  metric: MetricKey;
  label: string;
  unit: string;
}) {
  const points = entries
    .filter(
      (entry) =>
        typeof entry[metric] === 'number' &&
        Number.isFinite(entry[metric]) &&
        Number(entry[metric]) > 0 &&
        !Number.isNaN(new Date(entry.date).getTime()),
    )
    .map((entry) => ({
      date: new Date(entry.date).getTime(),
      value: Number(entry[metric]),
    }))
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
    x:
      points.length === 1
        ? 160
        : span
          ? 40 + ((point.date - firstTime) / span) * 244
          : 40 + (index / (points.length - 1)) * 244,
    y: 112 - ((point.value - minY) / (maxY - minY)) * 96,
  }));
  const line = coords
    .map(
      (point, index) =>
        `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join(' ');
  const area =
    coords.length > 1
      ? `${line} L ${coords.at(-1)?.x} 112 L ${coords[0].x} 112 Z`
      : '';

  return (
    <div className="measurement-chart">
      <h3 className="text-sm text-muted-foreground">{label}</h3>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-4xl font-bold tracking-tight tabular-nums">
          {latest ? (
            <>
              {formatValue(latest.value)}{' '}
              <span className="text-xl font-medium text-muted-foreground">
                {unit}
              </span>
            </>
          ) : (
            'Sin datos'
          )}
        </p>
        {latest && earliest && points.length > 1 ? (
          <p className="text-xs text-muted-foreground">
            {latest.value > earliest.value ? '+' : ''}
            {formatValue(latest.value - earliest.value)} {unit} en el periodo
          </p>
        ) : null}
      </div>
      {latest ? (
        <>
          {points.length > 1 ? (
            <svg
              aria-label={`Evolución de ${label.toLowerCase()}: ${points.length} medidas, última ${formatValue(latest.value)} ${unit}`}
              className="mt-5 h-auto w-full text-primary"
              viewBox="0 0 300 130"
            >
              <title>Evolución de {label.toLowerCase()}</title>
              {[16, 64, 112].map((y, index) => (
                <g key={y}>
                  <line
                    opacity="0.15"
                    stroke="currentColor"
                    strokeDasharray="3 4"
                    x1="40"
                    x2="284"
                    y1={y}
                    y2={y}
                  />
                  <text
                    x="0"
                    y={y + 3}
                    fill="var(--muted-foreground)"
                    fontSize="8"
                  >
                    {formatValue(maxY - (index * (maxY - minY)) / 2)}
                  </text>
                </g>
              ))}
              {area ? (
                <path d={area} fill="currentColor" opacity="0.10" />
              ) : null}
              {line ? (
                <path
                  d={line}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
              ) : null}
              {coords.map((point, index) => (
                <circle
                  key={`${points[index].date}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  fill="currentColor"
                  r={index === coords.length - 1 ? 4.5 : 3}
                  stroke="var(--background)"
                  strokeWidth="2"
                />
              ))}
            </svg>
          ) : (
            <p className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              Primera medida registrada. Añade otra para ver la tendencia.
            </p>
          )}
          <ol className="sr-only">
            {points.map((point, index) => (
              <li key={`${point.date}-${index}`}>
                {formatDate(new Date(point.date).toISOString())}:{' '}
                {formatValue(point.value)} {unit}
              </li>
            ))}
          </ol>
          <div className="flex justify-between gap-2 text-xs text-muted-foreground">
            <span>{formatDate(new Date(firstTime).toISOString())}</span>
            <span>
              {points.length} {points.length === 1 ? 'medida' : 'medidas'}
            </span>
            {points.length > 1 ? (
              <span>{formatDate(new Date(latest.date).toISOString())}</span>
            ) : null}
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Añade una medida para empezar a ver la evolución.
        </p>
      )}
    </div>
  );
}

export function MeasurementTracker({
  state,
  updateState,
}: {
  state: AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
}) {
  const entries = state.measurements
    .filter(
      (entry) =>
        typeof entry.weight === 'number' || typeof entry.waist === 'number',
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const [editing, setEditing] = useState<Measurement | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Measurement | null>(null);
  const [date, setDate] = useState('');
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [metric, setMetric] = useState<'weight' | 'waist'>('weight');
  const [range, setRange] = useState(90);
  const [now] = useState(() => Date.now());
  const chartEntries = range
    ? entries.filter(
        (entry) => Date.parse(entry.date) >= now - range * 86400000,
      )
    : entries;
  const weightNumber = optionalMeasurement(weight);
  const waistNumber = optionalMeasurement(waist);
  const valid = Boolean(
    date &&
    date <= dateInputValue(new Date().toISOString()) &&
    !Number.isNaN(new Date(`${date}T12:00:00`).getTime()) &&
    validMeasurements(weight, waist),
  );

  const openEditor = (entry?: Measurement) => {
    setEditing(entry ?? 'new');
    setDate(
      entry
        ? dateInputValue(entry.date)
        : dateInputValue(new Date().toISOString()),
    );
    setWeight(entry?.weight == null ? '' : String(entry.weight));
    setWaist(entry?.waist == null ? '' : String(entry.waist));
  };
  const save = () => {
    if (!valid || !editing) return;
    const original = editing === 'new' ? null : editing;
    const next: Measurement = {
      ...original,
      id: original?.id ?? crypto.randomUUID(),
      date: new Date(`${date}T12:00:00`).toISOString(),
    };
    if (weightNumber === undefined) delete next.weight;
    else next.weight = weightNumber;
    if (waistNumber === undefined) delete next.waist;
    else next.waist = waistNumber;
    updateState((current) => ({
      ...current,
      measurements: original
        ? current.measurements.map((entry) =>
            entry.id === original.id ? next : entry,
          )
        : [...current.measurements, next],
    }));
    setEditing(null);
  };

  return (
    <div>
      <section className="surface p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">Peso y cintura</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Evolución de tus medidas registradas
            </p>
          </div>
          <Button
            className="min-h-11 shrink-0 rounded-xl px-3"
            onClick={() => openEditor()}
          >
            <Plus className="size-4" /> Añadir
          </Button>
        </div>
        <ViewTabs
          label="Medida que se muestra"
          value={metric}
          onChange={setMetric}
          items={[
            { id: 'weight', label: 'Peso' },
            { id: 'waist', label: 'Cintura' },
          ]}
        />
        <fieldset className="mb-5 flex justify-end gap-1">
          <legend className="sr-only">Periodo de las medidas</legend>
          {[30, 90, 0].map((days) => (
            <button
              key={days}
              type="button"
              className="chart-range"
              aria-pressed={range === days}
              onClick={() => setRange(days)}
            >
              {days ? `${days} días` : 'Todo'}
            </button>
          ))}
        </fieldset>
        <MeasurementChart
          entries={chartEntries}
          label={metric === 'weight' ? 'Peso' : 'Cintura'}
          metric={metric}
          unit={metric === 'weight' ? 'kg' : 'cm'}
        />
      </section>
      <HistoryBrowser
        title="Historial de medidas"
        entries={entries}
        searchText={(entry) =>
          [
            typeof entry.weight === 'number' ? `${entry.weight} kg` : '',
            typeof entry.waist === 'number' ? `${entry.waist} cm` : '',
            formatDate(entry.date),
          ].join(' ')
        }
        renderEntry={(entry) => (
          <div className="flex min-h-16 items-center gap-3 border-b border-border py-2">
            <div className="min-w-0 flex-1">
              <strong className="block text-sm">
                {formatDate(entry.date)}
              </strong>
              <span className="mt-1 block text-xs text-muted-foreground">
                {[
                  typeof entry.weight === 'number'
                    ? `${formatValue(entry.weight)} kg`
                    : '',
                  typeof entry.waist === 'number'
                    ? `${formatValue(entry.waist)} cm`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <Button
              aria-label={`Editar medida del ${formatDate(entry.date)}`}
              className="size-11 shrink-0 rounded-xl"
              onClick={() => openEditor(entry)}
              size="icon"
              variant="ghost"
            >
              <Pencil className="size-4" />
            </Button>
          </div>
        )}
      />
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogTitle>
            {editing === 'new' ? 'Añadir medida' : 'Editar medida'}
          </DialogTitle>
          <DialogDescription>
            Registra peso, cintura o ambos. Puedes corregir la fecha y los
            valores más tarde.
          </DialogDescription>
          <MeasurementForm
            key={typeof editing === 'object' ? editing?.id : editing}
            date={date}
            weight={weight}
            waist={waist}
            onDate={setDate}
            onWeight={setWeight}
            onWaist={setWaist}
            onSave={save}
          />
          {editing && editing !== 'new' ? (
            <Button
              className="mt-2 h-11 w-full rounded-xl text-red-700 dark:text-red-300"
              onClick={() => {
                setDeleting(editing);
                setEditing(null);
              }}
              variant="ghost"
            >
              <Trash2 className="size-4" /> Eliminar registro
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogTitle>¿Eliminar esta medida?</DialogTitle>
          <DialogDescription>
            El registro del {deleting ? formatDate(deleting.date) : ''}{' '}
            desaparecerá de las gráficas y del historial. Podrás restaurarlo
            desde Registros eliminados, en Progreso o Perfil.
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setDeleting(null)} variant="outline">
              Cancelar
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deleting)
                  updateState((current) =>
                    moveToTrash(current, 'measurements', deleting.id),
                  );
                setDeleting(null);
              }}
            >
              <Trash2 className="size-4" /> Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
