'use client';

import { PreferenceSwitch } from '@/components/preference-switch';
import { Stepper } from '@/components/number-stepper';
import { restDuration } from '@/lib/rest-preferences';

export function RestSettings({ enabled, seconds, onEnabledChange, onSecondsChange, disabled = false }: { enabled: boolean; seconds: number; onEnabledChange: (enabled: boolean) => void; onSecondsChange: (seconds: number) => void; disabled?: boolean }) {
  return <div className="space-y-3">
    <PreferenceSwitch label="Descanso automático" description="Al marcar una serie · puedes omitirlo" checked={enabled} onCheckedChange={onEnabledChange} disabled={disabled} />
    <fieldset disabled={disabled || !enabled} className="min-w-0 space-y-2 disabled:opacity-50"><legend className="control-label mb-2">Duración del descanso</legend><Stepper label="Duración del descanso" value={seconds} onChange={value => onSecondsChange(restDuration(value))} step={15} min={15} suffix="s" /><p className="text-xs text-muted-foreground">15–600 s · se aplica al siguiente descanso</p></fieldset>
  </div>;
}
