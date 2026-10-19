'use client';
import { Button } from '@/components/ui/button';
import { OptionalSection } from '@/components/optional-section';
import { Stepper } from '@/components/number-stepper';
import { activityEstimates, formatPace } from '@/lib/activity-estimates';

export function ActivityEstimates({ minutes, distance, walking, stepLength, onStepLengthChange, onUseSteps, estimated = false }: { minutes: number; distance: number; walking: boolean; stepLength: number; onStepLengthChange: (value: number) => void; onUseSteps: (steps: number) => void; estimated?: boolean }) {
  const estimate = activityEstimates(minutes, distance, stepLength);
  return <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3">
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><span>Ritmo <strong className="tabular-nums">{formatPace(estimate.paceSeconds)} min/km</strong></span><span>Velocidad <strong className="tabular-nums">{estimate.speed === null ? '—' : estimate.speed.toLocaleString('es-ES', { maximumFractionDigits: 1 })} km/h</strong></span></div>
    {walking ? <><OptionalSection title="Ajustes de estimación" subtle><div><p className="control-label">Longitud de paso para estimar</p><Stepper label="Longitud de paso" value={stepLength} step={1} min={20} suffix="cm" onChange={value => onStepLengthChange(Math.min(150, value))} /></div><p className="text-xs text-muted-foreground">70 cm es una referencia inicial ajustable. Los pasos calculados son aproximados.</p></OptionalSection><Button disabled={estimate.steps === null} variant="outline" className="min-h-11 w-full rounded-xl" onClick={() => { if (estimate.steps !== null) onUseSteps(estimate.steps); }}>{estimated ? 'Pasos estimados' : 'Usar estimación'}{estimate.steps !== null ? ` · ${estimate.steps.toLocaleString('es-ES')}` : ''}</Button></> : null}
  </div>;
}
