'use client';
import type { TodaySession } from '@/hooks/use-today-session';
import { Check, ChevronLeft, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { getExerciseDisplayName } from '@/lib/exercise-catalog';
import { ExerciseSetEditor } from '@/components/exercise-set-editor';
import { supersetRange, supersetTransition } from '@/lib/exercise-sets';
import { OptionalSection } from '@/components/optional-section';
import { RirSelector } from '@/components/segmented-control';
import { PainSlider } from '@/components/pain-slider';
import { RestSettings } from '@/components/rest-settings';
import { MotionSurface, AnimatedDisclosure } from '@/components/motion-surface';
import { Stepper } from '@/components/number-stepper';
import { ExercisePreview } from '@/components/exercises/exercise-media';
import { ExerciseHistory } from '@/components/exercise-history';
function StatusDot({ pain }: { pain: number }) {
  return (
    <span
      className={`inline-block size-2.5 rounded-full ${pain >= 4 ? 'bg-red-500' : pain >= 2 ? 'bg-amber-400' : 'bg-emerald-500'}`}
    />
  );
}

export function TodayExerciseCard({ session }: { session: TodaySession }) {
  const {
    editable,
    state,
    updateState,
    onStopRest,
    compact,
    sessionExercises,
    workoutId,
    routineLogs,
    exercise,
    lastLog,
    sets,
    load,
    completed,
    rir,
    pain,
    note,
    changeLog,
    setLoad,
    setRir,
    setPain,
    setNote,
    details,
    description,
    rest,
    changeRest,
    exerciseCard,
    toggleSets,
    jumpToExercise,
    recommendation,
    suggestion,
    saveAndNext,
    skipExercise,
    exerciseIndex,
    setExerciseIndex,
    showNotes,
    setShowNotes,
    showHistory,
    setShowHistory,
    saved,
  } = session;
  return (
    <article
      ref={exerciseCard}
      className={`exercise-card ${saved ? 'ring-2 ring-emerald-500/40' : ''}`}
    >
      <MotionSurface motionKey={exercise.name}>
        <div className="flex justify-end border-b border-border px-4 py-1">
          <Button
            variant="ghost"
            className="min-h-11 text-sm"
            disabled={!editable}
            aria-pressed={compact}
            onClick={() =>
              updateState((current) => ({
                ...current,
                workoutView: compact ? 'guided' : 'compact',
              }))
            }
          >
            {compact ? 'Mostrar imagen y detalles' : 'Solo series'}
          </Button>
        </div>
        <div className={compact ? 'p-4 sm:p-5' : 'exercise-overview'}>
          {!compact ? (
            <ExercisePreview
              key={exercise.name}
              image={exercise.image || details?.image}
              name={getExerciseDisplayName(exercise.name, exercise.catalogId)}
              description={description}
            />
          ) : null}
          <div className="min-w-0">
            <p className="eyebrow">
              Ejercicio {exerciseIndex + 1} / {sessionExercises.length}
            </p>
            <h2 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">
              {getExerciseDisplayName(exercise.name, exercise.catalogId)}
            </h2>
            <p className="mt-3 text-sm font-semibold text-primary">
              {exercise.target}
            </p>
            {!compact ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Toca la imagen para ver la técnica
              </p>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <Button
            variant="ghost"
            className="mb-3 min-h-11 px-0 underline underline-offset-4"
            onClick={() => setShowHistory(true)}
          >
            Historial del ejercicio
          </Button>
          <Dialog open={showHistory} onOpenChange={setShowHistory}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
              <DialogTitle>
                {getExerciseDisplayName(exercise.name, exercise.catalogId)}
              </DialogTitle>
              <DialogDescription>
                Series de trabajo de sesiones anteriores. Las aproximaciones no
                cuentan.
              </DialogDescription>
              <ExerciseHistory
                state={state}
                exercise={exercise}
                excludeWorkoutId={workoutId}
              />
            </DialogContent>
          </Dialog>
          {exercise.unit !== 'reps' ? (
            <div className="mb-5">
              <OptionalSection
                title="Aplicar una carga a todas"
                summary={`${load} ${exercise.unit ?? 'kg'}`}
                subtle
              >
                <Stepper
                  label={`Carga de ${exercise.name}`}
                  value={load}
                  onChange={setLoad}
                  step={0.5}
                  suffix={exercise.unit ?? 'kg'}
                />
              </OptionalSection>
            </div>
          ) : null}
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="control-label">Series</span>
            <Button
              className="min-h-11 rounded-xl"
              data-haptic="success"
              variant="outline"
              aria-pressed={completed.length > 0 && completed.every(Boolean)}
              onClick={() =>
                toggleSets(
                  completed.map(() => !completed.every(Boolean)),
                  false,
                )
              }
            >
              <Check className="size-4" />
              {completed.every(Boolean) ? 'Desmarcar todas' : 'Marcar todas'}
            </Button>
          </div>
          {supersetRange(sessionExercises, exerciseIndex).end >
          supersetRange(sessionExercises, exerciseIndex).start ? (
            <p className="mb-3 border-l-2 border-primary pl-3 text-sm text-muted-foreground">
              Superserie · alterna una serie de cada ejercicio. El descanso
              empieza al terminar la ronda.
            </p>
          ) : null}
          <ExerciseSetEditor
            barbell={
              details?.equipment === 'barbell' ||
              details?.equipment === 'ez barbell'
            }
            name={getExerciseDisplayName(exercise.name, exercise.catalogId)}
            mode={exercise.mode}
            loadKind={exercise.loadKind}
            sets={sets}
            load={load}
            unit={exercise.unit}
            previous={lastLog}
            disabled={!editable}
            onChange={(sets) =>
              changeLog((log) => ({ ...log, sets, skipped: false }))
            }
            onComplete={(next, index) => {
              const checked = next[index].done;
              const warmup = next[index].kind === 'warmup';
              const transition = supersetTransition(
                sessionExercises,
                exerciseIndex,
                next,
                routineLogs,
              );
              toggleSets(
                next.map((set) => set.done),
                checked && !warmup && transition.rest,
              );
              if (checked && !warmup && transition.next !== exerciseIndex)
                jumpToExercise(transition.next);
            }}
          />

          <details
            key={compact ? 'compact' : 'guided'}
            open={compact ? undefined : true}
            className="mt-4"
          >
            <summary
              hidden={!compact}
              className="min-h-11 cursor-pointer py-3 text-sm font-medium"
            >
              Opciones y sensaciones
            </summary>
            <div>
              <RestSettings
                enabled={rest.enabled}
                seconds={rest.seconds}
                disabled={!editable}
                onEnabledChange={(restEnabled) => {
                  changeRest({ restEnabled });
                  if (!restEnabled) onStopRest();
                }}
                onSecondsChange={(restSeconds) => changeRest({ restSeconds })}
              />
            </div>
            <div className="mt-5">
              <OptionalSection
                title="Sensaciones del ejercicio"
                summary={`${exercise.mode === 'time' ? '' : `RIR ${rir} · `}${pain ? `molestias ${pain}/10` : 'sin molestias'}`}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  {exercise.mode !== 'time' ? (
                    <RirSelector
                      disabled={!editable}
                      onChange={setRir}
                      value={rir}
                    />
                  ) : null}
                  <PainSlider
                    disabled={!editable}
                    value={pain}
                    onChange={setPain}
                  />
                </div>
              </OptionalSection>
            </div>
            <div className="mt-5 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium">
                  <StatusDot pain={pain} /> Próxima sesión
                </span>
                <strong className="capitalize">
                  {suggestion === 'subir' && exercise.unit !== 'reps'
                    ? `Probar ${load + exercise.increment} ${exercise.unit ?? 'kg'}`
                    : suggestion === 'bajar'
                      ? 'Reducir carga'
                      : 'Mantener'}
                </strong>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {recommendation.reason}
              </p>
            </div>
          </details>
          <AnimatedDisclosure id="exercise-notes" open={showNotes}>
            <textarea
              aria-label="Notas rápidas"
              className="mt-4 min-h-20 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Técnica, sensaciones..."
              value={note}
            />
          </AnimatedDisclosure>
          <div className="mt-4 space-y-2">
            <Button
              className="h-14 w-full rounded-xl text-base font-bold shadow-sm"
              disabled={saved}
              data-haptic={completed.some(Boolean) ? 'success' : 'warning'}
              onClick={saveAndNext}
              size="lg"
            >
              {saved ? (
                <>
                  <Check /> Guardado
                </>
              ) : (
                'Guardar ejercicio'
              )}
            </Button>
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] gap-2">
              <Button
                aria-label="Ejercicio anterior"
                className="h-14 w-full rounded-xl"
                disabled={exerciseIndex === 0}
                onClick={() =>
                  setExerciseIndex((index) => Math.max(0, index - 1))
                }
                size="icon"
                variant="outline"
              >
                <ChevronLeft />
              </Button>
              <Button
                aria-label="Marcar como no completado y pasar al siguiente ejercicio"
                className="h-14 w-full min-w-0 rounded-xl px-3 text-sm font-semibold"
                onClick={skipExercise}
                size="sm"
                variant="outline"
              >
                Omitir ejercicio
              </Button>
              <Button
                aria-label="Añadir nota"
                aria-expanded={showNotes}
                aria-controls="exercise-notes"
                className="h-14 w-full rounded-xl"
                onClick={() => setShowNotes((value) => !value)}
                size="icon"
                variant="outline"
              >
                <MoreHorizontal />
              </Button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
            Las series se guardan automáticamente. Finaliza la sesión para
            añadirla al historial.
          </p>
        </div>
      </MotionSurface>
    </article>
  );
}
