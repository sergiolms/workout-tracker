'use client';

import { useState } from 'react';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { applyWorkoutEdit, createWorkoutEdits, statusFromLog, workoutStatusLabel, type WorkoutExerciseEdit } from '@/lib/workout-history';
import type { AppState, ExerciseLog, WorkoutLog } from '@/lib/storage';

const inputClass = 'mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base';

export function WorkoutHistoryEditor({ editable, state, workout, onSave, onClose }: { editable: boolean; state: AppState; workout: WorkoutLog; onSave: (updater: (state: AppState) => AppState) => void; onClose: () => void }) {
  const [date, setDate] = useState(new Date(workout.date).toLocaleDateString('en-CA'));
  const [notes, setNotes] = useState(workout.notes);
  const [edits, setEdits] = useState(() => createWorkoutEdits(state, workout, () => crypto.randomUUID()));
  const change = (index: number, updater: (log: ExerciseLog) => ExerciseLog) => setEdits((current) => current.map((edit, i) => i === index ? { ...edit, dirty: true, log: updater(edit.log) } : edit));
  const save = () => {
    if (!date || !editable) return;
    const timestamp = date === new Date(workout.date).toLocaleDateString('en-CA') ? workout.date : new Date(`${date}T12:00:00`).toISOString();
    onSave((current) => applyWorkoutEdit(current, workout.id, timestamp, notes, edits));
    onClose();
  };
  const hasInvalidValue = edits.some(({ log }) => [log.load, log.rir, log.pain, ...log.sets.map((set) => set.reps)].some((value) => !Number.isFinite(value) || value < 0) || log.sets.some((set) => !Number.isInteger(set.reps)));

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-xl">
    <div className="shrink-0 pr-8"><DialogTitle>Editar entrenamiento</DialogTitle><DialogDescription className="mt-2">Corrige los ejercicios, las series, las cargas y la fecha de esta sesión.</DialogDescription></div>
    <fieldset disabled={!editable} className="min-h-0 min-w-0 space-y-4 overflow-y-auto overscroll-contain px-1 pb-2">
      <label className="block"><span className="control-label">Fecha</span><input aria-label="Fecha del entrenamiento" className={inputClass} onChange={(event) => setDate(event.target.value)} type="date" value={date} /></label>
      <div className="space-y-3">{edits.map((edit: WorkoutExerciseEdit, index) => {
        const { log } = edit;
        const status = edit.dirty ? statusFromLog(log) : edit.originalStatus;
        return <details key={log.id} className="rounded-xl border border-border bg-background" open={edits.length === 1 ? true : undefined}>
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 p-3"><strong className="text-sm">{log.exercise}</strong><span className="shrink-0 text-xs font-semibold text-muted-foreground">{workoutStatusLabel[status]}</span></summary>
          <div className="space-y-3 border-t border-border p-3">
            {!edit.hasLog ? <p className="text-xs text-muted-foreground">No había detalle de series guardado. Revisa los valores si quieres completar este registro.</p> : null}
            <label className="block"><span className="control-label">Carga de {log.exercise}</span><input aria-label={`Carga de ${log.exercise}`} className={inputClass} min="0" step="0.5" type="number" value={log.load} onChange={(event) => change(index, (value) => ({ ...value, load: Number(event.target.value) }))} /></label>
            <div className="flex flex-wrap gap-2"><Button className="min-h-11 rounded-lg" data-haptic="success" variant="outline" onClick={() => change(index, (value) => ({ ...value, skipped: false, sets: value.sets.map((set) => ({ ...set, done: true })) }))}><Check className="size-4" /> Marcar todas</Button><Button className="min-h-11 rounded-lg" variant="outline" onClick={() => change(index, (value) => ({ ...value, skipped: false, sets: value.sets.map((set) => ({ ...set, done: false })) }))}>Pendiente</Button><Button className="min-h-11 rounded-lg" variant="outline" onClick={() => change(index, (value) => ({ ...value, skipped: true, sets: value.sets.map((set) => ({ ...set, done: false })) }))}>No realizado</Button></div>
            {log.sets.map((set, setIndex) => <div key={setIndex} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-3">
              <label className="min-w-0"><span className="control-label">Serie {setIndex + 1} · repeticiones</span><input aria-label={`Repeticiones de ${log.exercise}, serie ${setIndex + 1}`} className={inputClass} min="0" step="1" type="number" value={set.reps} onChange={(event) => change(index, (value) => ({ ...value, sets: value.sets.map((item, i) => i === setIndex ? { ...item, reps: Number(event.target.value) } : item) }))} /></label>
              <label className="flex min-h-12 cursor-pointer items-center gap-2"><Checkbox aria-label={`${log.exercise}, serie ${setIndex + 1} hecha`} checked={set.done} onCheckedChange={(checked) => change(index, (value) => ({ ...value, skipped: false, sets: value.sets.map((item, i) => i === setIndex ? { ...item, done: Boolean(checked) } : item) }))} /><span className="text-sm">Hecha</span></label>
              <Button aria-label={`Quitar serie ${setIndex + 1} de ${log.exercise}`} className="min-h-12" size="icon" variant="ghost" disabled={log.sets.length <= 1} onClick={() => change(index, (value) => ({ ...value, sets: value.sets.filter((_, i) => i !== setIndex) }))}><Trash2 className="size-4" /></Button>
            </div>)}
            <Button className="min-h-11 rounded-lg" variant="outline" onClick={() => change(index, (value) => ({ ...value, sets: [...value.sets, { reps: value.sets.at(-1)?.reps ?? 0, done: false }] }))}><Plus className="size-4" /> Añadir serie</Button>
            <div className="grid grid-cols-2 gap-3"><label><span className="control-label">RIR</span><input aria-label={`RIR de ${log.exercise}`} className={inputClass} min="0" max="10" type="number" value={log.rir} onChange={(event) => change(index, (value) => ({ ...value, rir: Math.max(0, Math.min(10, Number(event.target.value))) }))} /></label><label><span className="control-label">Molestias 0–10</span><input aria-label={`Molestias de ${log.exercise}`} className={inputClass} min="0" max="10" type="number" value={log.pain} onChange={(event) => change(index, (value) => ({ ...value, pain: Math.max(0, Math.min(10, Number(event.target.value))) }))} /></label></div>
            <label className="block"><span className="control-label">Nota del ejercicio</span><textarea aria-label={`Nota de ${log.exercise}`} className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-base" value={log.note} onChange={(event) => change(index, (value) => ({ ...value, note: event.target.value }))} /></label>
          </div>
        </details>;
      })}</div>
      <label className="block"><span className="control-label">Notas del entrenamiento</span><textarea aria-label="Notas del entrenamiento" className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-base" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    </fieldset>
    <div className="flex shrink-0 gap-2 border-t border-border pt-3"><Button className="min-h-12 rounded-xl" onClick={onClose} variant="outline">Cancelar</Button><Button className="min-h-12 flex-1 rounded-xl font-bold" data-haptic="success" disabled={!editable || !date || hasInvalidValue} onClick={save}><Save /> Guardar cambios</Button></div>
  </DialogContent></Dialog>;
}
