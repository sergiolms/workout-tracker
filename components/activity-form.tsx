'use client';
import { useState } from 'react';
import { Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/number-stepper';
import { OptionalSection } from '@/components/optional-section';
import { ActivityTypePicker, DurationPicker } from '@/components/activity-controls';
import { ActivityEstimates } from '@/components/activity-estimates';
import { activityEstimates } from '@/lib/activity-estimates';
import { EffortSelector } from '@/components/effort-selector';
import { uid } from '@/lib/local-date';
import type { AppState, CardioLog } from '@/lib/storage';

export function CardioForm({
  updateState,
}: {
  updateState: (updater: (state: AppState) => AppState) => void;
}) {
  const [type, setType] = useState('Caminata');
  const [minutes, setMinutes] = useState(0);
  const [steps, setSteps] = useState<number | null>(null);
  const [rpe, setRpe] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [stepLength, setStepLength] = useState(70);
  const [stepsEstimated, setStepsEstimated] = useState(false);
  const effectiveSteps = stepsEstimated
    ? activityEstimates(minutes, distance ?? 0, stepLength).steps
    : steps;
  const isClass = [
    'Pilates',
    'Spinning',
    'Body Pump',
    'Total Training',
  ].includes(type);
  const save = () => {
    if (minutes < 1) return;
    const log: CardioLog = {
      id: uid(),
      date: new Date().toISOString(),
      type,
      minutes,
      ...(!isClass && distance !== null ? { distance } : {}),
      ...(!isClass && effectiveSteps !== null
        ? {
            steps: effectiveSteps,
            ...(stepsEstimated
              ? { stepsEstimated: true, stepLengthCm: stepLength }
              : {}),
          }
        : {}),
      ...(rpe > 0 ? { rpe } : {}),
    };
    updateState((state) => ({
      ...state,
      cardioLogs: [...state.cardioLogs, log],
    }));
    setSaved(true);
  };
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-5">
        <ActivityTypePicker
          value={type}
          onChange={(value) => {
            setType(value);
            setSteps(effectiveSteps);
            setStepsEstimated(false);
            setSaved(false);
          }}
        />
        <DurationPicker
          value={minutes}
          onChange={(value) => {
            setMinutes(value);
            setSaved(false);
          }}
        />
        {!isClass ? (
          <OptionalSection
            title="Distancia y pasos"
            summary={
              [
                distance !== null ? `${distance} km` : '',
                effectiveSteps !== null
                  ? `${effectiveSteps} pasos${stepsEstimated ? ' estimados' : ''}`
                  : '',
              ]
                .filter(Boolean)
                .join(' · ') || 'Añadir datos de la cinta o del reloj'
            }
          >
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
              <div>
                <p className="control-label">Distancia</p>
                <Stepper
                  optional
                  label="Distancia en km"
                  value={distance}
                  onChange={(value) => {
                    setDistance(value);
                    setSaved(false);
                  }}
                  step={0.5}
                  suffix="km"
                />
              </div>
              <div>
                <p className="control-label">Pasos</p>
                <Stepper
                  optional
                  label="Pasos"
                  value={effectiveSteps}
                  onChange={(value) => {
                    setSteps(value);
                    setStepsEstimated(false);
                    setSaved(false);
                  }}
                  step={500}
                />
              </div>
            </div>
            <ActivityEstimates
              minutes={minutes}
              distance={distance ?? 0}
              walking={type === 'Caminata'}
              stepLength={stepLength}
              onStepLengthChange={(value) => {
                setStepLength(value);
                setSaved(false);
              }}
              estimated={stepsEstimated}
              onUseSteps={(value) => {
                setSteps(value);
                setStepsEstimated(true);
                setSaved(false);
              }}
            />
          </OptionalSection>
        ) : null}
        <OptionalSection
          title="Sensaciones"
          summary={
            rpe ? `Esfuerzo ${rpe}/10` : '¿Cómo te has sentido? · opcional'
          }
        >
          <EffortSelector
            value={rpe}
            onChange={(value) => {
              setRpe(value);
              setSaved(false);
            }}
          />
        </OptionalSection>
      </div>
      <Button
        className="mt-4 h-12 w-full rounded-xl font-bold"
        disabled={minutes < 1 || saved}
        onClick={save}
      >
        {saved ? (
          <>
            <Check /> Guardado
          </>
        ) : (
          <>
            <Save /> Guardar actividad
          </>
        )}
      </Button>
    </section>
  );
}

