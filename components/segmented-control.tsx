'use client';

import { useId, type CSSProperties } from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';

type Option = { value: number; label: string };

export function SegmentedControl({ label, options, value, onChange, disabled = false, description }: { label: string; options: Option[]; value: number; onChange: (value: number) => void; disabled?: boolean; description?: string }) {
  const id = useId();
  const index = options.findIndex((option) => option.value === value);
  return <fieldset disabled={disabled} className="min-w-0">
    <legend id={`${id}-label`} className="control-label">{label}</legend>
    <RadioGroup aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-description` : undefined} value={value} onValueChange={onChange} disabled={disabled} data-feedback="selection" className="segmented-control" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, '--segments': options.length, '--selected-segment': Math.max(0, index) } as CSSProperties}>
      <span aria-hidden="true" className="segmented-selection" style={{ opacity: index >= 0 ? 1 : 0 }} />
      {options.map((option) => <Radio.Root key={option.value} value={option.value} className="segmented-option">{option.label}</Radio.Root>)}
    </RadioGroup>
    {description ? <p id={`${id}-description`} className="mt-2 text-xs text-muted-foreground">{description}</p> : null}
  </fieldset>;
}

export function RirSelector({ value, onChange, disabled = false }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return <SegmentedControl label="RIR final" value={value} onChange={onChange} disabled={disabled} options={[0, 1, 2, 3, 4].map((number) => ({ value: number, label: String(number) }))} description={`${value} ${value === 1 ? 'repetición' : 'repeticiones'} en reserva`} />;
}
