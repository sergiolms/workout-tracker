'use client';

import { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { optionalMeasurement } from '@/lib/measurement-input';

export function MeasurementForm({ date, weight, waist, onDate, onWeight, onWaist, onSave }: { date: string; weight: string; waist: string; onDate: (value: string) => void; onWeight: (value: string) => void; onWaist: (value: string) => void; onSave: () => void }) {
  const id = useId();
  const [attempted, setAttempted] = useState(false);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const numberError = (value: string) => { const number = optionalMeasurement(value); return number !== undefined && (!Number.isFinite(number) || number <= 0) ? 'Escribe un número mayor que cero. Puedes usar coma o punto.' : ''; };
  const errors = { date: !date || date > today || Number.isNaN(Date.parse(`${date}T12:00:00`)) ? 'Elige una fecha válida que no sea futura.' : '', weight: numberError(weight), waist: numberError(waist), empty: !weight.trim() && !waist.trim() ? 'Añade peso, cintura o ambos.' : '' };
  return <form noValidate onSubmit={event => { event.preventDefault(); setAttempted(true); if (!Object.values(errors).some(Boolean)) onSave(); else { const invalid = event.currentTarget.querySelector<HTMLInputElement>(errors.date ? '[name="date"]' : errors.weight || errors.empty ? '[name="weight"]' : '[name="waist"]'); invalid?.focus(); } }}>
    <div className="mt-4 space-y-3"><label className="block"><span className="control-label">Fecha</span><input name="date" aria-invalid={attempted && Boolean(errors.date)} aria-describedby={attempted && errors.date ? `${id}-date` : undefined} className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3" max={today} onChange={event => onDate(event.target.value)} type="date" value={date} />{attempted && errors.date ? <span id={`${id}-date`} className="mt-1 block text-sm text-destructive">{errors.date}</span> : null}</label>
      <div className="grid grid-cols-2 gap-3">{([{ key: 'weight', label: 'Peso (kg)', value: weight, change: onWeight }, { key: 'waist', label: 'Cintura (cm)', value: waist, change: onWaist }] as const).map(field => <label key={field.key}><span className="control-label">{field.label}</span><input name={field.key} aria-invalid={attempted && Boolean(errors[field.key])} aria-describedby={attempted && errors[field.key] ? `${id}-${field.key}` : `${id}-optional`} className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base" inputMode="decimal" onChange={event => field.change(event.target.value)} placeholder="Opcional" type="text" value={field.value} />{attempted && errors[field.key] ? <span id={`${id}-${field.key}`} className="mt-1 block text-sm text-destructive">{errors[field.key]}</span> : null}</label>)}</div>
      <p id={`${id}-optional`} className="text-sm text-muted-foreground">Puedes dejar una de las dos medidas vacía.</p>
      {attempted && errors.empty ? <p role="alert" className="text-sm text-destructive">{errors.empty}</p> : null}
    </div><Button type="submit" className="mt-4 h-12 w-full rounded-xl font-bold"><Check className="size-4" /> Guardar medida</Button>
  </form>;
}
