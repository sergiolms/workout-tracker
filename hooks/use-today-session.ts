'use client';
import { buildWorkoutReview, exerciseLogDraft } from '@/lib/today-session';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getExerciseDescription,
  getExerciseDetails,
} from '@/lib/exercise-catalog';
import { completedPlanSlots } from '@/lib/plan-progress';
import { type Exercise } from '@/lib/workout-data';
import {
  type AppState,
  type ExerciseLog,
  type WorkoutLog,
} from '@/lib/storage';
import { activeWorkout, startWorkout } from '@/lib/workout-instance';
import { exerciseSets, workingSets } from '@/lib/exercise-sets';
import { statusFromLog } from '@/lib/workout-history';
import {
  previousExerciseLog,
  undoSkippedExercise,
} from '@/lib/workout-experience';
import { exercisePrescription } from '@/lib/exercise-prescription';
import {
  exerciseRecommendation,
  exerciseSuggestion,
  saveExerciseLog,
} from '@/lib/exercise-log';
import {
  exerciseRestPreferences,
  type RestPreferences,
} from '@/lib/rest-preferences';
import { localDateKey, uid } from '@/lib/local-date';
import {
  exerciseForLog,
  exerciseLogMetadata,
  sameExercise,
} from '@/lib/exercise-identity';
import { nextRotationRoutine, rotationRoutines } from '@/lib/rotation';
function markSessionStarted(key: string) {
  try {
    if (!localStorage.getItem(key))
      localStorage.setItem(key, String(Date.now()));
  } catch {
    /* Optional elapsed-time hint. */
  }
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

export function useTodaySession({
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
  const weekPlan = useMemo(
    () =>
      state.rotation
        ? {
            week: state.week,
            block: 'Rotación',
            routines: rotationRoutines(state),
            sessions: rotationRoutines(state).length,
            cardio: '',
            walks: '',
            mobility: '',
            optionalClass: '',
            deload: false,
            periodId: '',
            periodWeek: 1,
          }
        : (state.plan.find((week) => week.week === state.week) ??
          state.plan[0]),
    [state],
  );
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
      : (nextRotationRoutine(state) ??
          routineIds.find(
            (id) => !completedPlanSlots(state).has(`${state.week}:${id}`),
          ) ??
          routineIds[0] ??
          ''),
  );
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const sessionExercises = sessionById.get(routineId)?.exercises ?? [];
  const templateExercise = sessionExercises[exerciseIndex] ?? FALLBACK_EXERCISE;
  const day = localDateKey();
  const [instanceSeed, setInstanceSeed] = useState(uid);
  const resumedWorkout = activeWorkout(state, state.week, routineId);
  const workoutId = resumedWorkout?.id ?? `${instanceSeed}:${routineId}`;
  const savedWorkout = state.workoutLogs.find((log) => log.id === workoutId);
  const routineLogs = state.exerciseLogs.filter(
    (log) => log.workoutId === workoutId,
  );
  const currentLog = routineLogs.find((log) =>
    sameExercise(log, templateExercise),
  );
  const exercise = exerciseForLog(templateExercise, currentLog);
  const lastLog = previousExerciseLog(state.exerciseLogs, exercise, workoutId);
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
          ...exerciseLogMetadata(exercise),
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
    const log = exerciseLogDraft(
      { exercise, load, sets: confirmedSets, rir, pain, note },
      { id: workoutId, week: state.week, routine: routineId },
      new Date().toISOString(),
      currentLog?.id,
    );
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
    const log = exerciseLogDraft(
      {
        exercise,
        load,
        sets: sets.map((set) => ({ ...set, done: false })),
        rir,
        pain,
        note,
      },
      { id: workoutId, week: state.week, routine: routineId },
      new Date().toISOString(),
      currentLog?.id,
      true,
    );
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

  const buildWorkout = (date: string) =>
    buildWorkoutReview(
      state,
      { id: workoutId, week: state.week, routine: routineId },
      sessionExercises,
      { exercise, load, sets, rir, pain, note },
      date,
    );
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

  return {
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
    today,
    compact,
    weekPlan,
    sessionById,
    routineIds,
    sessionExercises,
    templateExercise,
    day,
    resumedWorkout,
    workoutId,
    savedWorkout,
    routineLogs,
    currentLog,
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
    setCompleted,
    setRir,
    setPain,
    setNote,
    details,
    description,
    rest,
    changeRest,
    sessionStartKey,
    ensureStarted,
    exerciseCard,
    toggleSets,
    jumpToExercise,
    recommendation,
    suggestion,
    commitExercise,
    saveAndNext,
    skipExercise,
    buildWorkout,
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
    instanceSeed,
    setInstanceSeed,
    showNotes,
    setShowNotes,
    showHistory,
    setShowHistory,
    showExercises,
    setShowExercises,
    saved,
    setSaved,
    confirmUnmarked,
    setConfirmUnmarked,
    finishReview,
    setFinishReview,
    reviewMinutes,
    setReviewMinutes,
  };
}
export type TodaySession = ReturnType<typeof useTodaySession>;
