'use client';
import { Stepper } from '@/components/number-stepper';
import { OptionalSection } from '@/components/optional-section';
import { PreferenceSwitch } from '@/components/preference-switch';
import { exercisePrescription, withExercisePrescription, type Prescription } from '@/lib/exercise-prescription';
import type { Exercise } from '@/lib/workout-data';

export function ExercisePrescriptionEditor({ exercise, onChange }: { exercise: Exercise; onChange: (exercise: Exercise) => void }) {
  const goal = exercisePrescription(exercise);
  const update = (changes: Partial<Prescription>) => onChange(withExercisePrescription(exercise, changes));
  const unit = exercise.target.split('·')[0].match(/\d\s*(m|s|seg|min)\s*$/i)?.[1];
  return <OptionalSection title="Objetivo del ejercicio" summary={exercise.target}>
    <div><p className="control-label">Series</p><Stepper label="Series objetivo" value={goal.sets} onChange={sets => update({ sets })} min={1} /></div>
    <div><p className="control-label">{unit ? `Cantidad por serie (${unit})` : 'Repeticiones por serie'}</p><div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2"><div><p className="mb-1 text-xs text-muted-foreground">Desde</p><Stepper label="Mínimo por serie" value={goal.minReps} onChange={minReps => update({ minReps })} min={1} /></div><div><p className="mb-1 text-xs text-muted-foreground">Hasta</p><Stepper label="Máximo por serie" value={goal.maxReps} onChange={maxReps => update({ maxReps })} min={1} /></div></div></div>
    <PreferenceSwitch label="Objetivo de RIR" description="Repeticiones que quieres dejar en reserva" checked={goal.minRir !== null} onCheckedChange={enabled => update({ minRir: enabled ? 2 : null, maxRir: enabled ? 3 : null })} />
    {goal.minRir !== null ? <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2"><div><p className="control-label">RIR mínimo</p><Stepper label="RIR objetivo mínimo" value={goal.minRir} onChange={minRir => update({ minRir })} /></div><div><p className="control-label">RIR máximo</p><Stepper label="RIR objetivo máximo" value={goal.maxRir ?? goal.minRir} onChange={maxRir => update({ maxRir })} /></div><p className="col-span-full text-xs text-muted-foreground">De 0 a 4, como el registro de sensaciones del ejercicio.</p></div> : null}
  </OptionalSection>;
}
