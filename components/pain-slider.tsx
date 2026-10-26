'use client';

import { useId, type CSSProperties } from 'react';
import { Slider } from '@base-ui/react/slider';

export function PainSlider({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const description =
    value === 0
      ? 'Sin molestias'
      : value >= 4
        ? 'Reduce o para'
        : 'Molestia leve';
  const color =
    value >= 4
      ? 'var(--destructive)'
      : value >= 2
        ? 'var(--warning)'
        : 'var(--primary)';
  return (
    <div
      className="pain-control min-w-0"
      data-swipe-ignore
      style={{ '--pain-color': color } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-3">
        <span id={`${id}-label`} className="control-label mb-0">
          Molestias 0–10
        </span>
        <output className="pain-value rounded-lg px-2 py-1 text-sm font-bold tabular-nums">
          {value}
          <span className="text-xs font-medium text-muted-foreground">
            {' '}
            / 10
          </span>
        </output>
      </div>
      <Slider.Root
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
        min={0}
        max={10}
        step={1}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="pain-slider group"
      >
        <Slider.Control className="relative flex min-h-12 w-full touch-none items-center select-none data-disabled:opacity-50">
          <Slider.Track className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <Slider.Indicator className="pain-fill h-full" />
          </Slider.Track>
          <Slider.Thumb
            aria-label="Molestias 0–10"
            getAriaValueText={(_, number) =>
              `${number} de 10, ${number === 0 ? 'Sin molestias' : number >= 4 ? 'Reduce o para' : 'Molestia leve'}`
            }
            className="pain-thumb relative block size-6 rounded-full border-[3px] bg-background shadow-sm outline-none after:absolute after:-inset-2.5 focus-visible:ring-3 focus-visible:ring-ring/40 data-disabled:opacity-50"
          />
        </Slider.Control>
      </Slider.Root>
      <div
        aria-hidden="true"
        className="flex justify-between px-1 text-[10px] font-semibold tabular-nums text-muted-foreground"
      >
        {[0, 2, 4, 6, 8, 10].map((number) => (
          <span key={number}>{number}</span>
        ))}
      </div>
      <p
        id={`${id}-description`}
        className="mt-2 text-xs text-muted-foreground"
      >
        {description}
      </p>
    </div>
  );
}
