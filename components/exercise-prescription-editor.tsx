'use client';
import { Stepper } from '@/components/number-stepper';
import { OptionalSection } from '@/components/optional-section';
import { PreferenceSwitch } from '@/components/preference-switch';
import { exercisePrescription, withExercisePrescription, type Prescription } from '@/lib/exercise-prescription';
import { exerciseRestPreferences, type RestPreferences } from '@/lib/rest-preferences';
import { RestSettings } from '@/components/rest-settings';
import type { Exercise } from '@/lib/workout-data';

export function ExercisePrescriptionEditor({ exercise, defaultRest, onChange, canLinkNext = true }: { exercise: Exercise; defaultRest: RestPreferences; onChange: (exercise: Exercise) => void; canLinkNext?: boolean }) {
  const goal = exercisePrescription(exercise);
  const rest = exerciseRestPreferences(exercise, defaultRest);
  const update = (changes: Partial<Prescription>) => onChange(withExercisePrescription(exercise, changes));
  const unit = exercise.target.split('·')[0].match(/\d\s*(m|s|seg|min)\s*$/i)?.[1];
  return <div className="space-y-2"><OptionalSection title="Objetivo del ejercicio" summary={exercise.target}>
    <div><p className="control-label">Series</p><Stepper label="Series objetivo" value={goal.sets} onChange={sets => update({ sets })} min={1} /></div>
    <div><p className="control-label">{unit ? `Cantidad por serie (${unit})` : 'Repeticiones por serie'}</p><div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2"><div><p className="mb-1 text-xs text-muted-foreground">Desde</p><Stepper label="Mínimo por serie" value={goal.minReps} onChange={minReps => update({ minReps })} min={1} /></div><div><p className="mb-1 text-xs text-muted-foreground">Hasta</p><Stepper label="Máximo por serie" value={goal.maxReps} onChange={maxReps => update({ maxReps })} min={1} /></div></div></div>
    <PreferenceSwitch label="Objetivo de RIR" description="Repeticiones que quieres dejar en reserva" checked={goal.minRir !== null} onCheckedChange={enabled => update({ minRir: enabled ? 2 : null, maxRir: enabled ? 3 : null })} />
    {goal.minRir !== null ? <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2"><div><p className="control-label">RIR mínimo</p><Stepper label="RIR objetivo mínimo" value={goal.minRir} onChange={minRir => update({ minRir })} /></div><div><p className="control-label">RIR máximo</p><Stepper label="RIR objetivo máximo" value={goal.maxRir ?? goal.minRir} onChange={maxRir => update({ maxRir })} /></div><p className="col-span-full text-xs text-muted-foreground">De 0 a 4, como el registro de sensaciones del ejercicio.</p></div> : null}
    <div><p className="control-label">Series de aproximación</p><Stepper label="Series de aproximación previstas" value={exercise.warmupSets ?? 0} min={0} max={6} onChange={warmupSets => onChange({ ...exercise, warmupSets })} /><p className="mt-2 text-xs text-muted-foreground">Se registran aparte y no cuentan para la progresión de carga.</p></div>
    {exercise.unit !== 'reps' ? <div><p className="control-label">Salto de carga sugerido</p><Stepper label="Incremento de carga recomendado" value={exercise.increment} step={0.5} min={0.5} max={20} suffix={exercise.unit ?? 'kg'} onChange={increment => onChange({ ...exercise, increment })} /></div> : null}
    {canLinkNext ? <PreferenceSwitch label="Superserie con el siguiente" description="Alterna una serie de cada ejercicio y descansa al terminar la ronda." checked={exercise.supersetWithNext === true} onCheckedChange={supersetWithNext => onChange({ ...exercise, supersetWithNext })} /> : null}
  </OptionalSection><RestSettings enabled={rest.enabled} seconds={rest.seconds} onEnabledChange={restEnabled => onChange({ ...exercise, restEnabled, restSeconds: rest.seconds })} onSecondsChange={restSeconds => onChange({ ...exercise, restEnabled: rest.enabled, restSeconds })} /></div>;
}
