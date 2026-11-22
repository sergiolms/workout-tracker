'use client';
import { toggleWorkoutPause } from '@/lib/workout-clock';
import { useState } from 'react';
import { useTodaySession } from '@/hooks/use-today-session';
import { TodayExerciseCard } from '@/components/today/exercise-card';
import { WarmupCard } from '@/components/today/warmup-card';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getExerciseDetails,
  getExerciseDisplayName,
} from '@/lib/exercise-catalog';
import { completedPlanSlots } from '@/lib/plan-progress';
import {
  ExercisePickerSheet,
  WorkoutReview,
} from '@/components/training-dialogs';
import { ProgressRing } from '@/components/progress-ring';
import { TodayActivities } from '@/components/today-activities';
export function TodayView(props: Parameters<typeof useTodaySession>[0]) {
  const session = useTodaySession(props);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const {
    editable,
    state,
    updateState,
    onOpenSessions,
    notice,
    today,
    weekPlan,
    sessionById,
    routineIds,
    sessionExercises,
    savedWorkout,
    routineLogs,
    exercise,
    completed,
    setCompleted,
    jumpToExercise,
    commitExercise,
    finishWorkout,
    review,
    reviewSets,
    doneNames,
    completedInRoutine,
    dark,
    routineId,
    setRoutineId,
    exerciseIndex,
    setExerciseIndex,
    showExercises,
    setShowExercises,
    confirmUnmarked,
    setConfirmUnmarked,
    finishReview,
    setFinishReview,
    reviewMinutes,
    setReviewMinutes,
  } = session;
  if (!weekPlan)
    return (
      <div className="space-y-4">
        <section className="summary-card">
          <div>
            <p className="eyebrow">Tu entrenamiento</p>
            <h1 className="page-title">Entrenamiento de hoy</h1>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Crea tu plan para empezar</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Define tus periodos y asigna las sesiones que quieras hacer.
          </p>
          <Button
            className="mt-4 h-12 w-full rounded-xl font-bold"
            onClick={onOpenSessions}
          >
            <Plus /> Crear plan
          </Button>
        </section>
        <WarmupCard state={state} updateState={updateState} />
        <TodayActivities state={state} updateState={updateState} />
      </div>
    );
  if (!routineIds.length)
    return (
      <div className="space-y-4">
        <section className="summary-card">
          <div>
            <p className="eyebrow">Semana {state.week}</p>
            <h1 className="page-title">Entrenamiento de hoy</h1>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">
            No hay sesiones asignadas a esta semana
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Añade o asigna una rutina desde tu plan.
          </p>
          <Button
            className="mt-4 h-12 w-full rounded-xl font-bold"
            onClick={onOpenSessions}
          >
            <Plus /> Abrir plan
          </Button>
        </section>
        <WarmupCard state={state} updateState={updateState} />
        <TodayActivities state={state} updateState={updateState} />
      </div>
    );

  return (
    <div className="space-y-4">
      <Dialog open={confirmUnmarked} onOpenChange={setConfirmUnmarked}>
        <DialogContent>
          <DialogTitle>¿Has completado todas las series?</DialogTitle>
          <DialogDescription>
            No has marcado ninguna serie de {exercise.name}. Puedes marcar todas
            como hechas antes de guardar.
          </DialogDescription>
          <div className="mt-2 flex flex-col gap-2">
            <Button
              className="min-h-12 rounded-xl"
              data-haptic="success"
              disabled={!editable}
              onClick={() => {
                const all = completed.map(() => true);
                setCompleted(() => all);
                commitExercise(all);
              }}
            >
              <Check /> Marcar todas y guardar
            </Button>
            <Button
              className="min-h-12 rounded-xl"
              disabled={!editable}
              onClick={() => commitExercise(completed)}
              variant="outline"
            >
              Guardar sin marcar
            </Button>
            <Button
              className="min-h-11 rounded-xl"
              onClick={() => setConfirmUnmarked(false)}
              variant="ghost"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <WorkoutReview
        open={finishReview}
        onOpenChange={setFinishReview}
        items={review.workout.exercises.map((item, index) => ({
          ...item,
          image:
            sessionExercises[index]?.image ??
            getExerciseDetails(item.name, sessionExercises[index]?.catalogId)
              ?.image,
          name: getExerciseDisplayName(
            item.name,
            sessionExercises[index]?.catalogId,
          ),
        }))}
        sets={reviewSets}
        minutes={reviewMinutes}
        onSelect={jumpToExercise}
        onFinish={finishWorkout}
        disabled={!editable}
        dark={dark}
      />
      {notice ? (
        <p
          aria-live="polite"
          className="motion-notice rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200"
        >
          {notice}
        </p>
      ) : null}
      <section className="section-heading">
        <div>
          <h1 className="page-title">Hoy</h1>
          <p className="page-subtitle capitalize">{today}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {state.rotation ? 'Secuencia flexible' : `Semana ${state.week}`}
        </span>
      </section>

      <section className="session-summary">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto">
              {(session.resumedWorkout ? [routineId] : routineIds).map((id) => (
                <button
                  key={id}
                  aria-pressed={routineId === id}
                  className={`min-h-11 shrink-0 rounded-lg px-3 text-xs font-bold ${routineId === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  onClick={() => {
                    setRoutineId(id);
                    setExerciseIndex(0);
                  }}
                  type="button"
                >
                  {!state.rotation &&
                  completedPlanSlots(state.workoutLogs).has(
                    `${state.week}:${id}`,
                  )
                    ? '✓ '
                    : ''}
                  {sessionById.get(id)?.name ?? id}
                </button>
              ))}
            </div>
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight">
            {weekPlan.block}
            {weekPlan.deload ? ' · Descarga' : ''}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {sessionExercises.length} ejercicios · {completedInRoutine}{' '}
            completados
          </p>
        </div>
        <ProgressRing
          value={
            sessionExercises.length
              ? (completedInRoutine / sessionExercises.length) * 100
              : 0
          }
          label={`${completedInRoutine}/${sessionExercises.length}`}
          description="Ejercicios completados"
        />
      </section>

      <section
        className="surface rounded-2xl border border-border p-4"
        aria-label="Sesión actual"
      >
        <p className="eyebrow">
          {session.resumedWorkout?.pausedAt
            ? 'Sesión en pausa'
            : 'Sesión actual'}
        </p>
        <h2 className="mt-1 text-lg font-bold">
          {sessionById.get(routineId)?.name ?? routineId}
        </h2>
        {session.resumedWorkout ? (
          <>
            <p className="my-2 font-mono text-2xl" aria-label="Tiempo activo">
              {Math.floor(session.elapsedSeconds / 3600)
                .toString()
                .padStart(2, '0')}
              :
              {Math.floor((session.elapsedSeconds / 60) % 60)
                .toString()
                .padStart(2, '0')}
              :{(session.elapsedSeconds % 60).toString().padStart(2, '0')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  session.onStopRest();
                  updateState((current) =>
                    toggleWorkoutPause(current, session.workoutId),
                  );
                }}
              >
                {session.resumedWorkout?.pausedAt ? 'Reanudar' : 'Pausar'}
              </Button>
              <Button
                onClick={() => {
                  setReviewMinutes(
                    Math.max(1, Math.round(session.elapsedSeconds / 60)),
                  );
                  setFinishReview(true);
                }}
              >
                Finalizar sesión
              </Button>
              <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
                Cancelar sesión
              </Button>
            </div>
          </>
        ) : (
          <Button className="mt-3" onClick={session.ensureStarted}>
            Empezar sesión
          </Button>
        )}
      </section>
      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogTitle>¿Cancelar esta sesión?</DialogTitle>
          <DialogDescription>
            Se descartarán las series registradas en esta sesión. El plan y los
            entrenamientos anteriores se conservan.
          </DialogDescription>
          <Button
            variant="destructive"
            onClick={() => {
              session.cancelSession();
              setConfirmCancel(false);
            }}
          >
            Descartar sesión
          </Button>
          <Button variant="outline" onClick={() => setConfirmCancel(false)}>
            Seguir entrenando
          </Button>
        </DialogContent>
      </Dialog>
      <WarmupCard state={state} updateState={updateState} />

      <section
        aria-label="Ejercicios de la sesión"
        className="sticky top-0 z-10 flex gap-2 bg-background py-2"
      >
        <ExercisePickerSheet
          open={showExercises}
          onOpenChange={setShowExercises}
          current={exerciseIndex}
          onSelect={jumpToExercise}
          dark={dark}
          items={sessionExercises.map((item) => ({
            name: getExerciseDisplayName(item.name, item.catalogId),
            image:
              item.image ??
              getExerciseDetails(item.name, item.catalogId)?.image,
            status: doneNames.has(item.name)
              ? 'done'
              : routineLogs.find((log) => log.exercise === item.name)?.skipped
                ? 'skipped'
                : 'pending',
          }))}
        />
        <Button
          variant="outline"
          className="h-14 shrink-0 rounded-xl px-3 text-sm"
          onClick={() => {
            setReviewMinutes(
              session.resumedWorkout
                ? Math.max(1, Math.round(session.elapsedSeconds / 60))
                : null,
            );
            setFinishReview(true);
          }}
        >
          Finalizar
        </Button>
      </section>

      <fieldset
        disabled={Boolean(session.resumedWorkout?.pausedAt)}
        className="min-w-0 disabled:opacity-60"
      >
        <TodayExerciseCard session={session} />
      </fieldset>

      {savedWorkout ? (
        <output className="motion-notice block text-center text-xs text-muted-foreground">
          Entrenamiento guardado en Progreso · Historial
        </output>
      ) : null}

      <TodayActivities state={state} updateState={updateState} />
    </div>
  );
}
