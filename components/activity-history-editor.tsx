'use client';

import { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptionalSection } from '@/components/optional-section';
import { ActivityTypePicker, DurationPicker } from '@/components/activity-controls';
import { ActivityEstimates } from '@/components/activity-estimates';
import { activityEstimates } from '@/lib/activity-estimates';
import { EffortSelector } from '@/components/effort-selector';
import { Stepper } from '@/components/number-stepper';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { activityDate, activityTimestamp, validActivity } from '@/lib/activity-history';
import type { CardioLog } from '@/lib/storage';

const inputClass = 'mt-1 h-12 w-full min-w-0 max-w-full rounded-xl border border-border bg-background px-3 text-base';

export function ActivityHistoryEditor({ activity, editable, dark = false, onSave, onClose, onDelete }: { activity: CardioLog; editable: boolean; dark?: boolean; onSave: (activity: CardioLog) => void; onClose: () => void; onDelete?: () => void }) {
  const [day, setDay] = useState(() => activityDate(activity.date));
  const [type, setType] = useState(activity.type);
  const [minutes, setMinutes] = useState(activity.minutes);
  const [distance, setDistance] = useState<number | null>(activity.distance ?? null);
  const [steps, setSteps] = useState<number | null>(activity.steps ?? null);
  const [rpe, setRpe] = useState(activity.rpe ?? 0);
  const [heartRate, setHeartRate] = useState<number | null>(activity.heartRate ?? null);
  const [estimated, setEstimated] = useState(activity.stepsEstimated === true);
  const [stepLength, setStepLength] = useState(activity.stepLengthCm ?? 70);
  const calculatedSteps = estimated ? activityEstimates(minutes, distance ?? 0, stepLength).steps : steps;
  const timestamp = activityTimestamp(activity.date, day);
  const edited: CardioLog = { id: activity.id, date: timestamp ?? '', type, minutes, ...(distance !== null ? { distance } : {}), ...(calculatedSteps !== null ? { steps: calculatedSteps, ...(estimated ? { stepsEstimated: true, stepLengthCm: stepLength } : {}) } : {}), ...(rpe > 0 ? { rpe } : {}), ...(heartRate !== null ? { heartRate } : {}) };
  const valid = timestamp !== null && validActivity(edited);

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className={`${dark ? 'dark' : ''} flex max-h-[90dvh] flex-col overflow-hidden rounded-3xl sm:max-w-lg`}>
    <div className="shrink-0 pr-8"><DialogTitle>Editar actividad</DialogTitle><DialogDescription className="mt-2">Corrige los datos de esta actividad registrada.</DialogDescription></div>
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2"><fieldset disabled={!editable} className="min-w-0 space-y-4">
      <ActivityTypePicker value={type} onChange={setType} />
      <DurationPicker value={minutes} onChange={setMinutes} label="Minutos de la actividad" />
      <OptionalSection title="Distancia y pasos" summary={[distance !== null ? `${distance} km` : '', calculatedSteps !== null ? `${calculatedSteps} pasos${estimated ? ' estimados' : ''}` : ''].filter(Boolean).join(' · ') || 'Añadir datos de la cinta o del reloj'}>
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2"><div className="min-w-0"><p className="control-label">Distancia</p><Stepper optional label="Distancia de la actividad" value={distance} onChange={setDistance} step={0.5} suffix="km" /></div><div className="min-w-0"><p className="control-label">Pasos</p><Stepper optional label="Pasos de la actividad" value={calculatedSteps} onChange={value => { setSteps(value); setEstimated(false); }} step={100} /></div></div>
        <ActivityEstimates minutes={minutes} distance={distance ?? 0} walking={type === 'Caminata'} stepLength={stepLength} onStepLengthChange={setStepLength} estimated={estimated} onUseSteps={value => { setSteps(value); setEstimated(true); }} />
      </OptionalSection>
      <OptionalSection title="Sensaciones" summary={[rpe ? `Esfuerzo ${rpe}/10` : '', heartRate !== null ? `${heartRate} bpm` : ''].filter(Boolean).join(' · ') || 'Esfuerzo y pulso · opcionales'}>
        <EffortSelector value={rpe} onChange={setRpe} /><div><p className="control-label">Pulso medio</p><Stepper optional label="Pulso medio de la actividad" value={heartRate} onChange={setHeartRate} suffix="bpm" /></div>
      </OptionalSection>
      <OptionalSection title="Fecha de la actividad" summary={day ? new Date(`${day}T12:00:00`).toLocaleDateString('es-ES') : 'Elegir fecha'} subtle><label className="block min-w-0"><span className="control-label">Fecha</span><input type="date" aria-label="Fecha de la actividad" className={inputClass} value={day} onChange={event => setDay(event.target.value)} /></label></OptionalSection>
    </fieldset></div>
    <div className="flex shrink-0 flex-wrap gap-2 border-t border-border pt-3">{onDelete ? <Button aria-label="Borrar actividad" className="min-h-12 rounded-xl text-red-700 dark:text-red-300" variant="outline" disabled={!editable} onClick={onDelete}><Trash2 className="size-4" /></Button> : null}<Button className="min-h-12 flex-1 rounded-xl" variant="outline" onClick={onClose}>Cancelar</Button><Button className="min-h-12 flex-1 rounded-xl" disabled={!editable || !valid} data-haptic="success" onClick={() => { if (editable && valid) { onSave(edited); onClose(); } }}><Save className="size-4" /> Guardar cambios</Button></div>
  </DialogContent></Dialog>;
}

export function ActivityDeleteDialog({ editable, dark = false, onClose, onConfirm }: { editable: boolean; dark?: boolean; onClose: () => void; onConfirm: () => void }) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className={dark ? 'dark' : ''}><DialogTitle>¿Borrar esta actividad?</DialogTitle><DialogDescription>Podrás restaurarla desde Registros eliminados, en Progreso o Perfil.</DialogDescription><div className="mt-4 flex justify-end gap-2"><Button onClick={onClose} variant="outline">Cancelar</Button><Button disabled={!editable} className="bg-red-600 text-white hover:bg-red-700" onClick={() => { if (editable) onConfirm(); }}><Trash2 /> Borrar</Button></div></DialogContent></Dialog>;
}
