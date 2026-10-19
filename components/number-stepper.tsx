'use client';

import { useState } from 'react';
import { parseNumericInput } from '@/lib/numeric-input';

type StepperBase = { label: string; step?: number; min?: number; suffix?: string };
type StepperProps = StepperBase & ({ optional: true; value: number | null; onChange: (value: number | null) => void } | { optional?: false; value: number; onChange: (value: number) => void });

export function Stepper(props: StepperProps) {
  const { value, label, step = 1, min = 0, suffix } = props;
  const emit = (next: number | null) => { if (next !== null) props.onChange(next); else if (props.optional) props.onChange(null); };
  const [draft, setDraft] = useState<string | null>(null);
  const integer = Number.isInteger(step) && suffix !== 'kg';
  const commit = () => {
    const text = draft ?? (value === null ? '' : String(value));
    if (!text.trim() && props.optional) { emit(null); setDraft(null); return; }
    const parsed = parseNumericInput(text, integer);
    if (parsed !== null && Math.max(min, parsed) !== value) emit(Math.max(min, parsed));
    setDraft(null);
  };
  const adjust = (direction: number) => emit(Math.max(min, Number(((value ?? 0) + direction * step).toFixed(4))));

  return <div className="number-stepper flex h-12 min-w-0 items-center rounded-2xl bg-muted/45 focus-within:ring-2 focus-within:ring-ring/30">
    <button aria-label={`Reducir ${label}`} className="grid h-full w-10 shrink-0 select-none place-items-center rounded-xl text-xl font-medium text-muted-foreground active:bg-muted" onClick={() => adjust(-1)} type="button">−</button>
    <div className="flex min-w-0 flex-1 items-center justify-center">
      <input aria-label={label} type="text" inputMode={integer ? 'numeric' : 'decimal'} enterKeyHint="done" autoComplete="off" className="h-11 min-w-0 max-w-full rounded bg-transparent px-1 text-center text-base font-bold tabular-nums outline-none" style={{ width: `calc(${Math.max(1, String(draft ?? value ?? '').length)}ch + 0.5rem)` }} placeholder={props.optional ? '—' : undefined} value={draft ?? value ?? ''}
        onFocus={(event) => { setDraft(value === null ? '' : String(value)); event.currentTarget.select(); }}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          if (!text.trim() && props.optional) { emit(null); return; }
          const parsed = parseNumericInput(text, integer);
          if (parsed !== null && parsed >= min && parsed !== value) emit(parsed);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setDraft(null); }
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); setDraft(null); adjust(event.key === 'ArrowUp' ? 1 : -1); }
        }} />
      {suffix ? <span aria-hidden="true" className="ml-1 shrink-0 text-xs font-medium text-muted-foreground">{suffix}</span> : null}
    </div>
    <button aria-label={`Aumentar ${label}`} className="grid h-full w-10 shrink-0 select-none place-items-center rounded-xl text-xl font-medium text-muted-foreground active:bg-muted" onClick={() => adjust(1)} type="button">+</button>
  </div>;
}
