'use client';
import { Stepper } from '@/components/number-stepper';
import { OptionalSection } from '@/components/optional-section';
import { PreferenceSwitch } from '@/components/preference-switch';
import {
  exercisePrescription,
  withExercisePrescription,
  type Prescription,
} from '@/lib/exercise-prescription';
import {
  exerciseRestPreferences,
  type RestPreferences,
} from '@/lib/rest-preferences';
import { RestSettings } from '@/components/rest-settings';
import type { Exercise } from '@/lib/workout-data';

export function ExercisePrescriptionEditor({
  exercise,
  defaultRest,
  onChange,
  canLinkNext = true,
}: {
  exercise: Exercise;
  defaultRest: RestPreferences;
  onChange: (exercise: Exercise) => void;
  canLinkNext?: boolean;
}) {
  const goal = exercisePrescription(exercise);
  const rest = exerciseRestPreferences(exercise, defaultRest);
  const timed = exercise.mode === 'time';
  const kind =
    exercise.loadKind ?? (exercise.unit === 'reps' ? 'none' : 'total');
  const update = (changes: Partial<Prescription>) =>
    onChange(withExercisePrescription(exercise, changes));
  return (
    <div className="space-y-2">
      <OptionalSection title="Objetivo del ejercicio" summary={exercise.target}>
        <label className="block text-sm font-medium">
          Progresión
          <select
            className="mt-1 h-11 w-full rounded border border-border bg-background px-3"
            value={exercise.progression ?? 'double'}
            onChange={(event) =>
              onChange({
                ...exercise,
                progression: event.target.value as 'off' | 'double',
              })
            }
          >
            <option value="double">Completar el rango y después subir</option>
            <option value="off">Manual · sin sugerencia de subida</option>
          </select>
        </label>
        <p className="text-sm text-muted-foreground">
          La propuesta explica el motivo. Nunca cambia tu carga por sí sola.
        </p>
        <label className="block text-sm font-medium">
          Registrar por
          <select
            className="mt-1 h-11 w-full rounded border border-border bg-background px-3"
            value={timed ? 'time' : 'reps'}
            onChange={(event) =>
              onChange(
                withExercisePrescription(
                  {
                    ...exercise,
                    mode: event.target.value as 'time' | 'reps',
                    targetSeconds: exercise.targetSeconds ?? 30,
                  },
                  { minRir: event.target.value === 'time' ? null : 2 },
                ),
              )
            }
          >
            <option value="reps">Repeticiones</option>
            <option value="time">Tiempo en segundos</option>
          </select>
        </label>
        <div>
          <p className="control-label">Series</p>
          <Stepper
            label="Series objetivo"
            value={goal.sets}
            onChange={(sets) => update({ sets })}
            min={1}
            max={20}
          />
        </div>
        {timed ? (
          <div>
            <p className="control-label">Segundos por serie</p>
            <Stepper
              label="Segundos objetivo"
              value={exercise.targetSeconds ?? 30}
              onChange={(targetSeconds) =>
                onChange(
                  withExercisePrescription({ ...exercise, targetSeconds }, {}),
                )
              }
              min={5}
              max={3600}
              step={5}
              suffix="s"
            />
          </div>
        ) : (
          <div>
            <p className="control-label">Repeticiones por serie</p>
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Desde</p>
                <Stepper
                  label="Repeticiones mínimas"
                  value={goal.minReps}
                  onChange={(minReps) => update({ minReps })}
                  min={1}
                  max={999}
                />
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Hasta</p>
                <Stepper
                  label="Repeticiones máximas"
                  value={goal.maxReps}
                  onChange={(maxReps) => update({ maxReps })}
                  min={1}
                  max={999}
                />
              </div>
            </div>
          </div>
        )}
        <label className="block text-sm font-medium">
          Cómo cuentas la carga
          <select
            className="mt-1 h-11 w-full rounded border border-border bg-background px-3"
            value={kind}
            onChange={(event) => {
              const loadKind = event.target.value as Exercise['loadKind'];
              onChange({
                ...exercise,
                loadKind,
                unit: loadKind === 'none' ? 'reps' : 'kg',
              });
            }}
          >
            <option value="total">Carga total</option>
            <option value="perHand">Peso de cada mancuerna</option>
            <option value="none">Sin carga · peso corporal</option>
            <option value="added">Lastre añadido</option>
            <option value="assistance">Ayuda de la máquina</option>
          </select>
        </label>
        {kind === 'perHand' ? (
          <p className="text-sm text-muted-foreground">
            Introduce el peso de una mancuerna. El volumen contará las dos.
          </p>
        ) : kind === 'assistance' ? (
          <p className="text-sm text-muted-foreground">
            Más kg significan más ayuda. No se comparan como una carga
            levantada.
          </p>
        ) : null}
        {!timed ? (
          <>
            <PreferenceSwitch
              label="Objetivo de RIR"
              description="Repeticiones que quieres dejar en reserva"
              checked={goal.minRir !== null}
              onCheckedChange={(enabled) =>
                update({
                  minRir: enabled ? 2 : null,
                  maxRir: enabled ? 3 : null,
                })
              }
            />
            {goal.minRir !== null ? (
              <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                <div>
                  <p className="control-label">RIR mínimo</p>
                  <Stepper
                    label="RIR objetivo mínimo"
                    value={goal.minRir}
                    onChange={(minRir) => update({ minRir })}
                    max={4}
                  />
                </div>
                <div>
                  <p className="control-label">RIR máximo</p>
                  <Stepper
                    label="RIR objetivo máximo"
                    value={goal.maxRir ?? goal.minRir}
                    onChange={(maxRir) => update({ maxRir })}
                    max={4}
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        <div>
          <p className="control-label">Series de aproximación</p>
          <Stepper
            label="Series de aproximación previstas"
            value={exercise.warmupSets ?? 0}
            min={0}
            max={6}
            onChange={(warmupSets) => onChange({ ...exercise, warmupSets })}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            No cuentan para la progresión.
          </p>
        </div>
        {kind !== 'none' && !timed ? (
          <div>
            <p className="control-label">Salto de carga sugerido</p>
            <Stepper
              label="Incremento de carga recomendado"
              value={exercise.increment}
              step={0.5}
              min={0.5}
              max={20}
              suffix="kg"
              onChange={(increment) => onChange({ ...exercise, increment })}
            />
          </div>
        ) : null}
        {canLinkNext ? (
          <PreferenceSwitch
            label="Superserie con el siguiente"
            description="Alterna una serie de cada ejercicio y descansa al terminar la ronda."
            checked={exercise.supersetWithNext === true}
            onCheckedChange={(supersetWithNext) =>
              onChange({ ...exercise, supersetWithNext })
            }
          />
        ) : null}
      </OptionalSection>
      <RestSettings
        enabled={rest.enabled}
        seconds={rest.seconds}
        onEnabledChange={(restEnabled) =>
          onChange({ ...exercise, restEnabled, restSeconds: rest.seconds })
        }
        onSecondsChange={(restSeconds) =>
          onChange({ ...exercise, restEnabled: rest.enabled, restSeconds })
        }
      />
    </div>
  );
}
