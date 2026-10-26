'use client';

import {
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Wind,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useId } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getExerciseDescription,
  getExerciseDetails,
  getExerciseDisplayName,
} from '@/lib/exercise-catalog';
import { completedPlanSlots } from '@/lib/plan-progress';
import { warmup, type Exercise } from '@/lib/workout-data';
import {
  type AppState,
  type ExerciseLog,
  type WorkoutLog,
} from '@/lib/storage';
import { activeWorkout, startWorkout } from '@/lib/workout-instance';
import { ExerciseSetEditor } from '@/components/exercise-set-editor';
import {
  exerciseSets,
  supersetRange,
  supersetTransition,
  workingSets,
} from '@/lib/exercise-sets';
import { statusFromLog } from '@/lib/workout-history';
import { OptionalSection } from '@/components/optional-section';
import {
  previousExerciseLog,
  undoSkippedExercise,
} from '@/lib/workout-experience';
import {
  ExercisePickerSheet,
  WorkoutReview,
} from '@/components/training-dialogs';
import { exercisePrescription } from '@/lib/exercise-prescription';
import {
  exerciseRecommendation,
  exerciseSuggestion,
  saveExerciseLog,
} from '@/lib/exercise-log';
import { RirSelector } from '@/components/segmented-control';
import { PainSlider } from '@/components/pain-slider';
import { RestSettings } from '@/components/rest-settings';
import {
  exerciseRestPreferences,
  type RestPreferences,
} from '@/lib/rest-preferences';
import { MotionSurface, AnimatedDisclosure } from '@/components/motion-surface';
import { ProgressRing } from '@/components/progress-ring';
import { Stepper } from '@/components/number-stepper';
import { localDateKey, uid } from '@/lib/local-date';
import { CardioForm } from '@/components/activity-form';
import { ExercisePreview } from '@/components/exercises/exercise-media';
import { exerciseIdentity, sameExercise } from '@/lib/exercise-identity';
import { ExerciseHistory } from '@/components/exercise-history';

function markSessionStarted(key: string) {
  try {
    if (!localStorage.getItem(key))
      localStorage.setItem(key, String(Date.now()));
  } catch {
    /* Optional elapsed-time hint. */
  }
}

function StatusDot({ pain }: { pain: number }) {
  return (
    <span
      className={`inline-block size-2.5 rounded-full ${pain >= 4 ? 'bg-red-500' : pain >= 2 ? 'bg-amber-400' : 'bg-emerald-500'}`}
    />
  );
}

const FALLBACK_EXERCISE: Exercise = {
  name: '',
  target: '',
  sets: 1,
  minReps: 0,
  maxReps: 0,
  increment: 1,
  unit: 'kg',
};

export function TodayView({
  accountId,
  editable,
  state,
  updateState,
  onOpenSessions,
  preferredRoutine,
  onFinish,
  notice,
  onStartRest,
  onStopRest,
  onOfferUndo,
  onClearUndo,
}: {
  accountId: string;
  onClearUndo: () => void;
  onStartRest: (seconds: number) => void;
  onStopRest: () => void;
  onOfferUndo: (message: string, action: () => void) => void;
  editable: boolean;
  state: AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
  onOpenSessions: () => void;
  preferredRoutine: string;
  onFinish: (workout: WorkoutLog, exerciseLog?: ExerciseLog) => void;
  notice: string;
}) {
  const today = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const compact = state.workoutView === 'compact';
  const weekPlan =
    state.plan.find((week) => week.week === state.week) ?? state.plan[0];
  const sessionById = useMemo(
    () => new Map(state.sessions.map((session) => [session.id, session])),
    [state.sessions],
  );
  const routineIds = useMemo(
    () => (weekPlan?.routines ?? []).filter((id) => sessionById.has(id)),
    [sessionById, weekPlan],
  );
  const [routineId, setRoutineId] = useState<string>(
    preferredRoutine && routineIds.includes(preferredRoutine)
      ? preferredRoutine
      : (routineIds.find(
          (id) =>
            !completedPlanSlots(state.workoutLogs).has(`${state.week}:${id}`),
        ) ??
          routineIds[0] ??
          ''),
  );
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const sessionExercises = sessionById.get(routineId)?.exercises ?? [];
  const exercise = sessionExercises[exerciseIndex] ?? FALLBACK_EXERCISE;
  const day = localDateKey();
  const [instanceSeed, setInstanceSeed] = useState(uid);
  const resumedWorkout = activeWorkout(state, state.week, routineId);
  const workoutId = resumedWorkout?.id ?? `${instanceSeed}:${routineId}`;
  const lastLog = previousExerciseLog(
    state.exerciseLogs,
    exercise,
    workoutId,
  );
  const savedWorkout = state.workoutLogs.find((log) => log.id === workoutId);
  const routineLogs = state.exerciseLogs.filter(
    (log) => log.workoutId === workoutId,
  );
  const currentLog = routineLogs.find((log) => sameExercise(log, exercise));
  const sets = exerciseSets(exercise, currentLog, lastLog);
  const load =
    currentLog?.load ?? lastLog?.load ?? (exercise.unit === 'reps' ? 0 : 20);
  const completed = sets.map((set) => set.done);
  const rir = currentLog?.rir ?? exercisePrescription(exercise).minRir ?? 2;
  const pain = currentLog?.pain ?? 0;
  const note = currentLog?.note ?? '';
  const changeLog = (updater: (log: ExerciseLog) => ExerciseLog) =>
    updateState((current) => {
      const existing = current.exerciseLogs.find(
        (log) => log.workoutId === workoutId && sameExercise(log, exercise),
      );
      const log = updater(
        existing ?? {
          id: `${workoutId}:${exercise.name}`,
          date: new Date().toISOString(),
          week: state.week,
          routine: routineId,
          workoutId,
          exercise: exercise.name,
          exerciseId: exerciseIdentity(exercise),
          unit: exercise.unit ?? 'kg',
          load,
          sets,
          rir,
          pain,
          note,
          suggestion: 'mantener',
        },
      );
      const started = startWorkout(current, {
        id: workoutId,
        date: day,
        week: state.week,
        routine: routineId,
        startedAt: new Date().toISOString(),
      });
      return saveExerciseLog(started, {
        ...log,
        date: new Date().toISOString(),
        suggestion: exerciseSuggestion(exercise, log),
      });
    });
  const setLoad = (load: number) =>
    changeLog((log) => ({
      ...log,
      load,
      sets: log.sets.map((set) => ({ ...set, load })),
    }));
  const setCompleted = (updater: (old: boolean[]) => boolean[]) =>
    changeLog((log) => {
      const next = updater(log.sets.map((set) => set.done));
      return {
        ...log,
        skipped: false,
        sets: log.sets.map((set, i) => ({ ...set, done: next[i] ?? false })),
      };
    });
  const setRir = (rir: number) => changeLog((log) => ({ ...log, rir }));
  const setPain = (pain: number) => changeLog((log) => ({ ...log, pain }));
  const setNote = (note: string) => changeLog((log) => ({ ...log, note }));
  const details = getExerciseDetails(exercise.name, exercise.catalogId);
  const description =
    exercise.description ||
    getExerciseDescription(exercise.name, exercise.catalogId);
  const [showNotes, setShowNotes] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCardio, setShowCardio] = useState(false);
  const [showExercises, setShowExercises] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmUnmarked, setConfirmUnmarked] = useState(false);
  const [finishReview, setFinishReview] = useState(false);
  const rest = exerciseRestPreferences(exercise, state);
  const changeRest = (changes: RestPreferences) =>
    updateState((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === routineId
          ? {
              ...session,
              exercises: session.exercises.map((item) =>
                item.name === exercise.name
                  ? {
                      ...item,
                      restEnabled: rest.enabled,
                      restSeconds: rest.seconds,
                      ...changes,
                    }
                  : item,
              ),
            }
          : session,
      ),
    }));
  const sessionStartKey = `base-session-start:${accountId}:${workoutId}`;
  const ensureStarted = () =>
    updateState((current) =>
      startWorkout(current, {
        id: workoutId,
        date: day,
        week: state.week,
        routine: routineId,
        startedAt: new Date().toISOString(),
      }),
    );

  const [reviewMinutes, setReviewMinutes] = useState<number | null>(null);
  const exerciseCard = useRef<HTMLElement>(null);
  const toggleSets = (next: boolean[], rest: boolean) => {
    const before = [...completed];
    const index = exerciseIndex;
    markSessionStarted(sessionStartKey);
    ensureStarted();
    setCompleted(() => next);
    if (rest && exerciseRestPreferences(exercise, state).enabled)
      onStartRest(exerciseRestPreferences(exercise, state).seconds);
    else if (!rest) onStopRest();
    onOfferUndo(
      next.some((done, i) => done && !completed[i])
        ? 'Serie marcada'
        : 'Series actualizadas',
      () => {
        setCompleted(() => before);
        setExerciseIndex(index);
        onStopRest();
      },
    );
  };
  const jumpToExercise = (index: number) => {
    setExerciseIndex(index);
    setSaved(false);
    setShowExercises(false);
    setFinishReview(false);
    window.setTimeout(
      () =>
        exerciseCard.current?.scrollIntoView({
          block: 'start',
          behavior: 'instant',
        }),
      0,
    );
  };

  useEffect(() => {
    if (routineIds.length && !routineIds.includes(routineId)) {
      const timer = window.setTimeout(() => {
        setRoutineId(routineIds[0]);
        setExerciseIndex(0);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [routineId, routineIds]);

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
      </div>
    );

  const recommendation = exerciseRecommendation(exercise, { sets, rir, pain });
  const suggestion = recommendation.suggestion;

  const commitExercise = (done: boolean[]) => {
    if (!editable) return;
    onClearUndo();
    ensureStarted();
    markSessionStarted(sessionStartKey);
    const confirmedSets = sets.map((set, index) => ({
      ...set,
      done: Boolean(done[index]),
    }));
    const log: ExerciseLog = {
      id: currentLog?.id ?? `${workoutId}:${exercise.name}`,
      date: new Date().toISOString(),
      week: state.week,
      routine: routineId,
      workoutId,
      exercise: exercise.name,
      exerciseId: exerciseIdentity(exercise),
      unit: exercise.unit ?? 'kg',
      load,
      sets: confirmedSets,
      rir,
      pain,
      note,
      skipped: false,
      suggestion: exerciseSuggestion(exercise, {
        sets: confirmedSets,
        rir,
        pain,
      }),
    };
    updateState((current) => saveExerciseLog(current, log));
    setConfirmUnmarked(false);
    setSaved(true);
    window.setTimeout(() => {
      setExerciseIndex((current) =>
        current < sessionExercises.length - 1 ? current + 1 : current,
      );
      setSaved(false);
    }, 260);
  };

  const saveAndNext = () => {
    if (!completed.some(Boolean)) {
      setConfirmUnmarked(true);
      return;
    }
    commitExercise(completed);
  };

  const skipExercise = () => {
    if (!editable) return;
    ensureStarted();
    markSessionStarted(sessionStartKey);
    const previous = routineLogs.find(
      (item) => item.exercise === exercise.name,
    );
    const previousWorkouts = state.workoutLogs;
    const index = exerciseIndex;
    const log: ExerciseLog = {
      id: currentLog?.id ?? `${workoutId}:${exercise.name}`,
      date: new Date().toISOString(),
      week: state.week,
      routine: routineId,
      workoutId,
      exercise: exercise.name,
      load,
      sets: sets.map((set) => ({ ...set, done: false })),
      rir,
      pain,
      note,
      skipped: true,
      suggestion: 'mantener',
    };
    updateState((current) => saveExerciseLog(current, log));
    onStopRest();
    onOfferUndo('Ejercicio omitido', () => {
      updateState((current) =>
        undoSkippedExercise(current, log, previous, previousWorkouts),
      );
      setExerciseIndex(index);
      setSaved(false);
    });
    setExerciseIndex((current) =>
      Math.min(current + 1, sessionExercises.length - 1),
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 500);
  };

  const buildWorkout = (date: string) => {
    const currentExerciseLog = completed.some(Boolean)
      ? ({
          id:
            routineLogs.find((item) => item.exercise === exercise.name)?.id ??
            `${workoutId}:${exercise.name}`,
          date,
          week: state.week,
          routine: routineId,
          workoutId,
          exercise: exercise.name,
          load,
          sets,
          rir,
          pain,
          note,
          skipped: false,
          suggestion,
        } satisfies ExerciseLog)
      : undefined;
    const logs = currentExerciseLog
      ? [
          ...routineLogs.filter((item) => item.exercise !== exercise.name),
          currentExerciseLog,
        ]
      : routineLogs;
    const workout: WorkoutLog = {
      id: workoutId,
      date,
      week: state.week,
      routine: routineId,
      routineName: sessionById.get(routineId)?.name ?? routineId,
      notes: savedWorkout?.notes ?? '',
      exercises: sessionExercises.map((item) => {
        const log = logs.find((entry) => entry.exercise === item.name);
        const status = log ? statusFromLog(log) : 'pending';
        return { name: item.name, status, ...(log ? { logId: log.id } : {}) };
      }),
    };
    return { workout, currentExerciseLog, logs };
  };
  const finishWorkout = () => {
    if (!editable) return;
    const { workout, currentExerciseLog } = buildWorkout(
      new Date().toISOString(),
    );
    onStopRest();
    onClearUndo();
    try {
      localStorage.removeItem(sessionStartKey);
    } catch {
      /* Optional elapsed hint. */
    }
    setFinishReview(false);
    onFinish(workout, currentExerciseLog);
    setInstanceSeed(uid());
  };
  const review = buildWorkout(day);
  const reviewSets = review.logs.reduce(
    (sum, log) =>
      sum +
      (log.skipped
        ? 0
        : workingSets(log.sets).filter((set) => set.done).length),
    0,
  );

  const doneNames = new Set(
    routineLogs
      .filter((log) => statusFromLog(log) === 'done')
      .map((log) => log.exercise),
  );
  const completedInRoutine = doneNames.size;
  const dark =
    state.theme === 'dark' ||
    (state.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

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
          Semana {state.week}
        </span>
      </section>

      <section className="session-summary">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto">
              {routineIds.map((id) => (
                <button
                  key={id}
                  aria-pressed={routineId === id}
                  className={`min-h-11 shrink-0 rounded-lg px-3 text-xs font-bold ${routineId === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  onClick={() => {
                    onClearUndo();
                    setRoutineId(id);
                    setExerciseIndex(0);
                  }}
                  type="button"
                >
                  {completedPlanSlots(state.workoutLogs).has(
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
            image: getExerciseDetails(item.name, item.catalogId)?.image,
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
            let start = 0;
            try {
              start = Number(localStorage.getItem(sessionStartKey));
            } catch {
              /* Optional elapsed hint. */
            }
            setReviewMinutes(
              start
                ? Math.max(1, Math.round((Date.now() - start) / 60000))
                : null,
            );
            setFinishReview(true);
          }}
        >
          Finalizar
        </Button>
      </section>

      <article
        ref={exerciseCard}
        className={`exercise-card ${saved ? 'ring-2 ring-emerald-500/40' : ''}`}
      >
        <MotionSurface motionKey={exercise.name}>
          <div className="flex justify-end border-b border-border px-4 py-1"><Button variant="ghost" className="min-h-11 text-sm" disabled={!editable} aria-pressed={compact} onClick={() => updateState(current => ({ ...current, workoutView: compact ? 'guided' : 'compact' }))}>{compact ? 'Mostrar imagen y detalles' : 'Solo series'}</Button></div>
          <div className={compact ? 'p-4 sm:p-5' : 'exercise-overview'}>
            {!compact ? <ExercisePreview
              key={exercise.name}
              image={exercise.image || details?.image}
              name={getExerciseDisplayName(exercise.name, exercise.catalogId)}
              description={description}
            /> : null}
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
              {!compact ? <p className="mt-2 text-xs text-muted-foreground">
                Toca la imagen para ver la técnica
              </p> : null}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <Button variant="ghost" className="mb-3 min-h-11 px-0 underline underline-offset-4" onClick={() => setShowHistory(true)}>Historial del ejercicio</Button>
            <Dialog open={showHistory} onOpenChange={setShowHistory}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogTitle>{getExerciseDisplayName(exercise.name, exercise.catalogId)}</DialogTitle><DialogDescription>Series de trabajo de sesiones anteriores. Las aproximaciones no cuentan.</DialogDescription><ExerciseHistory state={state} exercise={exercise} excludeWorkoutId={workoutId} /></DialogContent></Dialog>
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
              name={getExerciseDisplayName(exercise.name, exercise.catalogId)}
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

            <details key={compact ? 'compact' : 'guided'} open={compact ? undefined : true} className="mt-4"><summary hidden={!compact} className="min-h-11 cursor-pointer py-3 text-sm font-medium">Opciones y sensaciones</summary>
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
                summary={`RIR ${rir} · ${pain ? `molestias ${pain}/10` : 'sin molestias'}`}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <RirSelector
                    disabled={!editable}
                    onChange={setRir}
                    value={rir}
                  />
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

      {savedWorkout ? (
        <output className="motion-notice block text-center text-xs text-muted-foreground">
          Entrenamiento guardado en Progreso · Historial
        </output>
      ) : null}

      <button
        aria-expanded={showCardio}
        aria-controls="cardio-form"
        className="quick-card"
        onClick={() => setShowCardio((value) => !value)}
        type="button"
      >
        <span className="icon-tile">
          <Wind />
        </span>
        <span className="flex-1 text-left">
          <strong className="block">Registrar actividad</strong>
          <small className="text-muted-foreground">
            Cardio, caminata o clase
          </small>
        </span>
        <Plus className={`transition ${showCardio ? 'rotate-45' : ''}`} />
      </button>
      <AnimatedDisclosure id="cardio-form" open={showCardio}>
        <CardioForm updateState={updateState} />
      </AnimatedDisclosure>
    </div>
  );
}

function WarmupCard({
  state,
  updateState,
}: {
  state: AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const keys = warmup.map((item) => `${localDateKey()}:${item}`);
  return (
    <section className="warmup-card">
      <button
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="icon-tile">
          <RotateCcw />
        </span>
        <span className="flex-1">
          <strong className="block">Calentamiento rápido</strong>
          <small className="text-muted-foreground">
            {keys.filter((key) => state.warmupDone.includes(key)).length}/
            {warmup.length} completado
          </small>
        </span>
        <ChevronRight
          className={`text-muted-foreground transition ${open ? 'rotate-90' : ''}`}
        />
      </button>
      <AnimatedDisclosure id={panelId} open={open}>
        <div className="space-y-1 border-t border-border p-3">
          {warmup.map((item, index) => {
            const key = keys[index];
            return (
              <label
                key={item}
                className="flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-muted"
              >
                <Checkbox
                  checked={state.warmupDone.includes(key)}
                  onCheckedChange={(checked) =>
                    updateState((current) => ({
                      ...current,
                      warmupDone: checked
                        ? [
                            ...current.warmupDone.filter(
                              (done) => done !== key,
                            ),
                            key,
                          ]
                        : current.warmupDone.filter((done) => done !== key),
                    }))
                  }
                />
                <span className="text-sm font-medium">{item}</span>
              </label>
            );
          })}
        </div>
      </AnimatedDisclosure>
    </section>
  );
}
