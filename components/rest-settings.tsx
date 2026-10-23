'use client';

import { PreferenceSwitch } from '@/components/preference-switch';
import { Timer, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Stepper } from '@/components/number-stepper';
import { restDuration } from '@/lib/rest-preferences';

export function RestSettings({ enabled, seconds, onEnabledChange, onSecondsChange, disabled = false }: { enabled: boolean; seconds: number; onEnabledChange: (enabled: boolean) => void; onSecondsChange: (seconds: number) => void; disabled?: boolean }) {
  return <Dialog><DialogTrigger className="rest-setting-trigger"><Timer className="size-4 text-primary" /><span className="flex-1 text-left">Descanso entre series</span><span className="text-sm font-semibold">{enabled ? `${seconds} s` : 'Desactivado'}</span><ChevronRight className="size-4 text-muted-foreground" /></DialogTrigger><DialogContent className="rounded-3xl"><DialogTitle>Descanso de este ejercicio</DialogTitle><DialogDescription>Se inicia al marcar una serie hecha. Puedes omitirlo cuando quieras.</DialogDescription><div className="space-y-4 py-2">
    <PreferenceSwitch label="Descanso automático" description={enabled ? `${seconds} s entre series de este ejercicio` : 'Desactivado para este ejercicio'} checked={enabled} onCheckedChange={onEnabledChange} disabled={disabled} />
    {enabled ? <fieldset disabled={disabled} className="min-w-0 space-y-2 disabled:opacity-50"><legend className="control-label mb-2">Tiempo entre series</legend><Stepper label="Duración del descanso" value={seconds} onChange={value => onSecondsChange(restDuration(value))} step={15} min={15} max={600} suffix="s" /></fieldset> : null}
  </div></DialogContent></Dialog>;
}
