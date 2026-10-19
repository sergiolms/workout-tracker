'use client';

import {
  Activity, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, CircleUserRound,
  Cloud, CloudOff, Download, Dumbbell, Footprints, HeartPulse, Home, Info, LogOut, Moon, Monitor,
  Maximize2, MoreHorizontal, Pause, Pencil, Play, Plus, RotateCcw, Save, Search, Sun, Timer, Trash2, Wind, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useId, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { MeasurementTracker } from '@/components/measurement-tracker';
import { MobilityIllustration } from '@/components/mobility-illustration';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { exerciseCatalogSections, exerciseImageUrl, getExerciseDescription, getExerciseDetails, getExerciseDisplayName, type CatalogExercise } from '@/lib/exercise-catalog';
import { firebaseConfigured, loadFromFirebase, signInWithGoogle, signOutFirebase, subscribeToAuth, syncToFirebase, type FirebaseUser } from '@/lib/firebase';
import { completedPlanSlots, countsTowardPlan, nextPlanSession, planProgress } from '@/lib/plan-progress';
import { mobilityGuides, resetMobilityKeys } from '@/lib/mobility-guide';
import { mobility, warmup, type Exercise } from '@/lib/workout-data';
import { BASE_SESSION_IDS, backupLocalState, clearAppLocalData, defaultState, loadLocalState, saveLocalState, weeksFromPeriods, type AppState, type CardioLog, type ExerciseLog, type PlanPeriod, type Session, type WorkoutLog } from '@/lib/storage';

import { WorkoutPersistence, type PersistenceStatus } from '@/lib/persistence';
import { appRelease } from '@/lib/app-version';
import { ActivityHistoryEditor, ActivityDeleteDialog } from '@/components/activity-history-editor';
import { OptionalSection } from '@/components/optional-section';
import { SectionedExerciseCatalog } from '@/components/sectioned-exercise-catalog';
import { ActivityTypePicker, DurationPicker } from '@/components/activity-controls';
import { EffortSelector } from '@/components/effort-selector';
import { ActivityEstimates } from '@/components/activity-estimates';
import { activityEstimates, formatPace } from '@/lib/activity-estimates';
import { applyActivityEdit, deleteActivity } from '@/lib/activity-history';
import { WorkoutHistoryEditor } from '@/components/workout-history-editor';
import { previousExerciseLog, undoSkippedExercise } from '@/lib/workout-experience';
import { ExercisePickerSheet, WorkoutReview } from '@/components/training-dialogs';
import { GhostPerformance, RestDock, SaveStatus, UndoNotice } from '@/components/workout-feedback';
import { ExercisePrescriptionEditor } from '@/components/exercise-prescription-editor';
import { exercisePrescription } from '@/lib/exercise-prescription';
import { exerciseSuggestion, saveExerciseLog } from '@/lib/exercise-log';
import { RirSelector } from '@/components/segmented-control';
import { PainSlider } from '@/components/pain-slider';
import { RestSettings } from '@/components/rest-settings';
import { restPreferences } from '@/lib/rest-preferences';
import { PreferenceSwitch } from '@/components/preference-switch';
import { LiquidNavigation } from '@/components/liquid-navigation';
import { MotionSurface, AnimatedDisclosure } from '@/components/motion-surface';
import { ProgressRing } from '@/components/progress-ring';
import { HapticCheck } from '@/components/haptic-check';
import { Stepper } from '@/components/number-stepper';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import { useInteractionFeedback } from '@/hooks/use-interaction-feedback';

type Tab = 'today' | 'plan' | 'timers' | 'progress' | 'mobility' | 'profile';

const navItems: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: 'today', label: 'Hoy', icon: Home },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'timers', label: 'Timer', icon: Timer },
  { id: 'progress', label: 'Progreso', icon: BarChart3 },
  { id: 'mobility', label: 'Movilidad', icon: Footprints },
];

const today = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
const localDateKey = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;


function markSessionStarted(key: string) { try { if (!localStorage.getItem(key)) localStorage.setItem(key, String(Date.now())); } catch { /* Optional elapsed-time hint. */ } }

function StatusDot({ pain }: { pain: number }) {
  return <span className={`inline-block size-2.5 rounded-full ${pain >= 4 ? 'bg-red-500' : pain >= 2 ? 'bg-amber-400' : 'bg-emerald-500'}`} />;
}

const FALLBACK_EXERCISE: Exercise = { name: '', target: '', sets: 1, minReps: 0, maxReps: 0, increment: 1, unit: 'kg' };

type ExerciseDraft = { load: number; reps: number[]; completed: boolean[]; rir: number; pain: number; note: string };
function useExerciseDraft(key: string, initial: ExerciseDraft) {
  const subscribe = useCallback((notify: () => void) => {
    const onStorage = (event: StorageEvent) => { if (event.key === key) notify(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);
  const getSnapshot = useCallback(() => localStorage.getItem(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const [entry, setEntry] = useState<{ key: string; value: ExerciseDraft } | null>(null);
  let restored = initial;
  if (raw) { try { restored = JSON.parse(raw) as ExerciseDraft; } catch { restored = initial; } }
  const savedValue = entry?.key === key ? entry.value : restored;
  const value = { ...savedValue, reps: initial.reps.map((fallback, index) => savedValue.reps[index] ?? fallback), completed: initial.completed.map((_, index) => savedValue.completed[index] ?? false) };
  function change<K extends keyof ExerciseDraft>(field: K, next: ExerciseDraft[K] | ((old: ExerciseDraft[K]) => ExerciseDraft[K])) {
    const updated = { ...value, [field]: typeof next === 'function' ? (next as (old: ExerciseDraft[K]) => ExerciseDraft[K])(value[field]) : next };
    setEntry({ key, value: updated });
    try { localStorage.setItem(key, JSON.stringify(updated)); } catch { /* In-memory draft remains usable. */ }
  }
  function restoreCompleted(completed: boolean[]) {
    let latest = value;
    try { latest = JSON.parse(localStorage.getItem(key) ?? 'null') ?? value; } catch { /* Use current draft. */ }
    const updated = { ...latest, completed };
    setEntry({ key, value: updated });
    try { localStorage.setItem(key, JSON.stringify(updated)); } catch { /* Keep in-memory draft. */ }
  }
  return { value, change, restoreCompleted };
}

function ExerciseImage({ image, name }: { image?: string; name: string }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  if (!image || failedImage === image) return <span className="grid size-full place-items-center bg-muted text-primary"><Dumbbell className="size-7" /></span>;
  return <img alt={`Demostración de ${name}`} className="size-full object-cover" height="160" width="160" loading="lazy" onError={() => setFailedImage(image)} src={exerciseImageUrl(image)} />;
}

function conciseExerciseText(description: string) {
  const sentences = description.split(/(?<=\.)\s+/).filter(Boolean);
  const first = sentences[0] ?? description;
  if (first.length <= 130) return [first];
  const boundary = first.lastIndexOf(' ', 125);
  return [first.slice(0, boundary > 80 ? boundary : 125).replace(/[\s,;:.]+$/, '') + '…'];
}

function ExercisePreview({ image, name, description, compact = false }: { image?: string; name: string; description: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const failed = Boolean(image && failedImage === image);
  const steps = conciseExerciseText(description);
  return (
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) setFailedImage(null); }}>
      <DialogTrigger
        aria-label={`Ver demostración de ${name}`}
        className={`group relative block shrink-0 overflow-hidden rounded-xl border border-border bg-white outline-offset-4 transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary ${compact ? 'size-16' : 'size-20'}`}
        onClick={event => { setDark(Boolean(event.currentTarget.closest('.dark'))); }}
      >
        <ExerciseImage image={image} name={name} />
        <span aria-hidden="true" className="absolute bottom-1 right-1 grid size-6 place-items-center rounded-md bg-black/65 text-white"><Maximize2 className="size-3.5" /></span>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className={`${dark ? 'dark' : ''} max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overscroll-contain rounded-3xl p-0 sm:max-w-[560px]`}>
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-popover p-4 sm:p-5">
          <div className="min-w-0 flex-1"><DialogTitle className="pr-2 text-lg font-bold leading-snug">{name}</DialogTitle><DialogDescription className="mt-1 text-xs">Demostración e instrucciones</DialogDescription></div>
          <DialogClose aria-label="Cerrar demostración" className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground transition hover:bg-accent"><X className="size-5" /></DialogClose>
        </div>
        {open && image && <div className="bg-white">
          {failed ? <div><img className="mx-auto max-h-[40dvh] w-full object-contain" src={exerciseImageUrl(image)} alt={name} /><output className="block px-4 py-2 text-center text-xs text-zinc-600">Animación no disponible. Se muestra la imagen.</output></div> : <video
            key={image}
            aria-label={`Demostración animada de ${name}`}
            className="mx-auto aspect-square max-h-[44dvh] w-full object-contain"
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/exercise-videos/${image.replace(/\.jpg$/, '.mp4')}`}
            poster={exerciseImageUrl(image)}
            playsInline muted loop autoPlay
            preload="metadata"
            onError={() => setFailedImage(image ?? null)}
          />}
        </div>}
        <div className="p-4 sm:p-5">
          {!image && <p className="mb-4 text-sm text-muted-foreground">Este ejercicio no tiene demostración visual disponible.</p>}
          <ol className="space-y-3">{steps.map((step, index) => <li key={index} className="flex gap-3 text-sm leading-relaxed"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold tabular-nums">{index + 1}</span><span>{step}</span></li>)}</ol>
          {image && <p className="mt-5 border-t border-border pt-3 text-[11px] text-muted-foreground">Demostración orientativa · © Gym visual</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type TimerMode = 'descanso' | 'amrap' | 'hiit' | 'libre';

function formatClock(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function WorkoutTimer() {
  const [mode, setMode] = useState<TimerMode>('descanso');
  const [duration, setDuration] = useState(90);
  const [work, setWork] = useState(40);
  const [rest, setRest] = useState(20);
  const [rounds, setRounds] = useState(8);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const origin = useRef(0);
  const base = useRef(0);
  const total = mode === 'libre' ? Infinity : mode === 'hiit' ? (work + rest) * rounds - rest : duration;
  const finished = elapsed >= total;
  const cycle = work + rest;
  const round = Math.min(rounds, Math.floor(elapsed / cycle) + 1);
  const resting = mode === 'hiit' && elapsed % cycle >= work;
  const remaining = finished ? 0 : mode === 'libre' ? elapsed : mode === 'hiit' ? (resting ? cycle : work) - elapsed % cycle : total - elapsed;
  const phase = finished ? 'Completado' : mode === 'hiit' ? `${resting ? 'Descanso' : 'Trabajo'} · ${round}/${rounds}` : mode === 'libre' ? 'Tiempo transcurrido' : mode.toUpperCase();

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const seconds = base.current + Math.floor((Date.now() - origin.current) / 1000);
      setElapsed(Math.min(seconds, total));
      if (seconds >= total) {
        setRunning(false);
        navigator.vibrate?.([180, 80, 180]);
      }
    };
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [running, total]);

  const reset = () => { setRunning(false); setElapsed(0); base.current = 0; };
  const toggle = () => {
    if (running) {
      base.current = Math.min(total, base.current + Math.floor((Date.now() - origin.current) / 1000));
      setElapsed(base.current);
      setRunning(false);
    } else {
      if (finished) { base.current = 0; setElapsed(0); }
      origin.current = Date.now();
      setRunning(true);
    }
  };
  return (
    <section className="timer-card">
      <div className="flex items-center gap-3 border-b border-border p-4"><span className="icon-tile"><Timer /></span><span className="flex-1"><strong className="block">Temporizadores</strong><small className="text-muted-foreground">Descanso · AMRAP · HIIT · Cronómetro</small></span>{running || elapsed ? <span className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary">{phase} · {formatClock(remaining)}</span> : null}</div>
      <div className="p-4">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">{(['descanso','amrap','hiit','libre'] as TimerMode[]).map(item => <button key={item} aria-pressed={mode === item} className={`min-h-11 rounded-lg text-xs font-bold ${mode === item ? 'bg-card shadow-sm' : ''}`} onClick={() => { reset(); setMode(item); setDuration(item === 'amrap' ? 600 : 90); }}>{item === 'libre' ? 'Crono' : item.toUpperCase()}</button>)}</div>
        <fieldset disabled={running || elapsed > 0} className="mt-3 disabled:opacity-50">
          {mode === 'hiit' ? <div className="grid gap-2">{[['Trabajo (s)', work, setWork, 5], ['Descanso (s)', rest, setRest, 5], ['Rondas', rounds, setRounds, 1]].map(([label, value, setter, step]) => <div key={String(label)} className="grid grid-cols-[1fr_150px] items-center gap-2"><span className="text-sm">{String(label)}</span><Stepper label={String(label)} value={Number(value)} onChange={setter as (value: number) => void} step={Number(step)} min={Number(step)} /></div>)}</div> : mode !== 'libre' ? <div className="flex gap-2">{(mode === 'amrap' ? [300,600,900,1200] : [60,90,120]).map(seconds => <button key={seconds} aria-pressed={duration === seconds} onClick={() => setDuration(seconds)} className={`min-h-11 flex-1 rounded-xl border text-sm font-bold ${duration === seconds ? 'border-primary bg-primary/10' : 'border-border'}`}>{mode === 'amrap' ? `${seconds / 60} min` : `${seconds}s`}</button>)}</div> : null}
        </fieldset>
        <div className="mt-4 flex items-center gap-3"><div className="flex-1"><p role="timer" className="text-4xl font-bold tabular-nums">{formatClock(remaining)}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{phase}</p></div><Button aria-label={running ? 'Pausar temporizador' : 'Iniciar temporizador'} className="size-14 rounded-full" onClick={toggle} size="icon">{running ? <Pause /> : <Play />}</Button><Button aria-label="Reiniciar temporizador" className="size-12 rounded-full" onClick={reset} size="icon" variant="outline"><RotateCcw /></Button></div>
        <p className="mt-3 text-xs text-muted-foreground">Mantén la app visible para recibir el aviso al terminar.</p>
      </div>
    </section>
  );
}

function TodayView({ editable, state, updateState, onOpenSessions, preferredRoutine, onFinish, notice, onStartRest, onStopRest, onOfferUndo, onClearUndo }: { onClearUndo: () => void; onStartRest: () => void; onStopRest: () => void; onOfferUndo: (message: string, action: () => void) => void; editable: boolean; state: AppState; updateState: (updater: (state: AppState) => AppState) => void; onOpenSessions: () => void; preferredRoutine: string; onFinish: (workout: WorkoutLog, exerciseLog?: ExerciseLog) => void; notice: string }) {
  const weekPlan = state.plan.find((week) => week.week === state.week) ?? state.plan[0];
  const sessionById = useMemo(() => new Map(state.sessions.map((session) => [session.id, session])), [state.sessions]);
  const routineIds = useMemo(() => (weekPlan?.routines ?? []).filter((id) => sessionById.has(id)), [sessionById, weekPlan]);
  const [routineId, setRoutineId] = useState<string>(preferredRoutine && routineIds.includes(preferredRoutine) ? preferredRoutine : routineIds.find((id) => !completedPlanSlots(state.workoutLogs).has(`${state.week}:${id}`)) ?? routineIds[0] ?? '');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const sessionExercises = sessionById.get(routineId)?.exercises ?? [];
  const exercise = sessionExercises[exerciseIndex] ?? FALLBACK_EXERCISE;
  const day = localDateKey();
  const workoutId = `${day}:${state.week}:${routineId}`;
  const lastLog = previousExerciseLog(state.exerciseLogs, exercise.name, workoutId);
  const savedWorkout = state.workoutLogs.find((log) => log.id === workoutId);
  const routineLogs = state.exerciseLogs.filter((log) => log.workoutId === workoutId || (!log.workoutId && log.week === state.week && log.routine === routineId && new Date(log.date).toLocaleDateString('en-CA') === day));
  const draftKey = `base-draft:${day}:${state.week}:${routineId}:${exercise.name}`;
  const initialDraft = { load: lastLog?.load ?? (exercise.unit === 'reps' ? 0 : 20), reps: Array(exercise.sets).fill(exercise.maxReps), completed: Array(exercise.sets).fill(false), rir: exercisePrescription(exercise).minRir ?? 2, pain: 0, note: '' };
  const { value: draft, change, restoreCompleted } = useExerciseDraft(draftKey, initialDraft);
  const { load, reps: setReps, completed, rir, pain, note } = draft;
  const setLoad = (value: number) => change('load', value);
  const setSetReps = (value: (old: number[]) => number[]) => change('reps', value);
  const setCompleted = (value: (old: boolean[]) => boolean[]) => change('completed', value);
  const setRir = (value: number) => change('rir', value);
  const setPain = (value: number) => change('pain', value);
  const setNote = (value: string) => change('note', value);
  const details = getExerciseDetails(exercise.name, exercise.catalogId);
  const description = exercise.description || getExerciseDescription(exercise.name, exercise.catalogId);
  const [showNotes, setShowNotes] = useState(false);
  const [showCardio, setShowCardio] = useState(false);
  const [showExercises, setShowExercises] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmUnmarked, setConfirmUnmarked] = useState(false);
  const [finishReview, setFinishReview] = useState(false);
  const rest = restPreferences(state);
  const sessionStartKey = `base-session-start:${workoutId}`;

  const [reviewMinutes, setReviewMinutes] = useState<number | null>(null);
  const exerciseCard = useRef<HTMLElement>(null);
  const toggleSets = (next: boolean[], rest: boolean) => {
    const before = [...completed];
    const index = exerciseIndex;
    markSessionStarted(sessionStartKey);
    setCompleted(() => next);
    if (rest && state.restEnabled !== false) onStartRest();
    else if (!rest) onStopRest();
    onOfferUndo(next.some((done, i) => done && !completed[i]) ? 'Serie marcada' : 'Series actualizadas', () => { restoreCompleted(before); setExerciseIndex(index); onStopRest(); });
  };
  const jumpToExercise = (index: number) => { setExerciseIndex(index); setSaved(false); setShowExercises(false); setFinishReview(false); window.setTimeout(() => exerciseCard.current?.scrollIntoView({ block: 'start', behavior: 'instant' }), 0); };

  useEffect(() => {
    if (routineIds.length && !routineIds.includes(routineId)) {
      const timer = window.setTimeout(() => { setRoutineId(routineIds[0]); setExerciseIndex(0); }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [routineId, routineIds]);

  if (!weekPlan) return <div className="space-y-4"><section className="summary-card"><div><p className="eyebrow">Tu entrenamiento</p><h1 className="page-title">Entrenamiento de hoy</h1></div></section><section className="rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-bold">Crea tu plan para empezar</h2><p className="mt-2 text-sm text-muted-foreground">Define tus periodos y asigna las sesiones que quieras hacer.</p><Button className="mt-4 h-12 w-full rounded-xl font-bold" onClick={onOpenSessions}><Plus /> Crear plan</Button></section><WarmupCard state={state} updateState={updateState} /></div>;
  if (!routineIds.length) return <div className="space-y-4"><section className="summary-card"><div><p className="eyebrow">Semana {state.week}</p><h1 className="page-title">Entrenamiento de hoy</h1></div></section><section className="rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-bold">No hay sesiones asignadas a esta semana</h2><p className="mt-2 text-sm text-muted-foreground">Añade o asigna una rutina desde tu plan.</p><Button className="mt-4 h-12 w-full rounded-xl font-bold" onClick={onOpenSessions}><Plus /> Abrir plan</Button></section><WarmupCard state={state} updateState={updateState} /></div>;

  const suggestion = exerciseSuggestion(exercise, { sets: setReps.map((reps, index) => ({ reps, done: completed[index] })), rir, pain });

  const commitExercise = (done: boolean[]) => {
    if (!editable) return;
    onClearUndo();
    markSessionStarted(sessionStartKey);
    const sets = setReps.map((reps, index) => ({ reps, done: Boolean(done[index]) }));
    const log: ExerciseLog = { id: routineLogs.find((item) => item.exercise === exercise.name)?.id ?? uid(), date: new Date().toISOString(), week: state.week, routine: routineId, workoutId, exercise: exercise.name, load, sets, rir, pain, note, skipped: false, suggestion: exerciseSuggestion(exercise, { sets, rir, pain }) };
    updateState((current) => saveExerciseLog(current, log));
    setConfirmUnmarked(false);
    setSaved(true);
    window.setTimeout(() => {
      setExerciseIndex((current) => current < sessionExercises.length - 1 ? current + 1 : current);
      setSaved(false);
    }, 260);
  };

  const saveAndNext = () => {
    if (!completed.some(Boolean)) { setConfirmUnmarked(true); return; }
    commitExercise(completed);
  };

  const skipExercise = () => {
    if (!editable) return;
    markSessionStarted(sessionStartKey);
    const previous = routineLogs.find(item => item.exercise === exercise.name);
    const previousWorkouts = state.workoutLogs;
    const index = exerciseIndex;
    const log: ExerciseLog = { id: routineLogs.find((item) => item.exercise === exercise.name)?.id ?? uid(), date: new Date().toISOString(), week: state.week, routine: routineId, workoutId, exercise: exercise.name, load, sets: setReps.map((reps) => ({ reps, done: false })), rir, pain, note, skipped: true, suggestion: 'mantener' };
    updateState((current) => saveExerciseLog(current, log));
    onStopRest();
    onOfferUndo('Ejercicio omitido', () => { updateState(current => undoSkippedExercise(current, log, previous, previousWorkouts)); setExerciseIndex(index); setSaved(false); });
    setExerciseIndex((current) => Math.min(current + 1, sessionExercises.length - 1));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 500);
  };

  const buildWorkout = (date: string) => {
    const currentExerciseLog = completed.some(Boolean) ? {
      id: routineLogs.find((item) => item.exercise === exercise.name)?.id ?? `${workoutId}:${exercise.name}`, date, week: state.week, routine: routineId, workoutId, exercise: exercise.name, load,
      sets: setReps.map((reps, index) => ({ reps, done: completed[index] })), rir, pain, note, skipped: false, suggestion,
    } satisfies ExerciseLog : undefined;
    const logs = currentExerciseLog
      ? [...routineLogs.filter((item) => item.exercise !== exercise.name), currentExerciseLog]
      : routineLogs;
    const workout: WorkoutLog = {
      id: workoutId, date, week: state.week, routine: routineId,
      routineName: sessionById.get(routineId)?.name ?? routineId, notes: savedWorkout?.notes ?? '',
      exercises: sessionExercises.map((item) => {
        const log = logs.find((entry) => entry.exercise === item.name);
        const doneSets = log?.sets.filter((set) => set.done).length ?? 0;
        const status = log?.skipped ? 'skipped' : !log ? 'pending' : doneSets > 0 && doneSets === log.sets.length ? 'done' : doneSets ? 'partial' : 'pending';
        return { name: item.name, status, ...(log ? { logId: log.id } : {}) };
      }),
    };
    return { workout, currentExerciseLog, logs };
  };
  const finishWorkout = () => {
    if (!editable) return;
    const { workout, currentExerciseLog } = buildWorkout(new Date().toISOString());
    onStopRest();
    onClearUndo();
    try { localStorage.removeItem(sessionStartKey); } catch { /* Optional elapsed hint. */ }
    setFinishReview(false);
    onFinish(workout, currentExerciseLog);
  };
  const review = buildWorkout(day);
  const reviewSets = review.logs.reduce((sum, log) => sum + (log.skipped ? 0 : log.sets.filter(set => set.done).length), 0);

  const doneNames = new Set(routineLogs.filter((log) => !log.skipped && log.sets.length > 0 && log.sets.every(set => set.done)).map(log => log.exercise));
  const completedInRoutine = doneNames.size;
  const dark = state.theme === 'dark' || (state.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="space-y-4">
      <Dialog open={confirmUnmarked} onOpenChange={setConfirmUnmarked}><DialogContent><DialogTitle>¿Has completado todas las series?</DialogTitle><DialogDescription>No has marcado ninguna serie de {exercise.name}. Puedes marcar todas como hechas antes de guardar.</DialogDescription><div className="mt-2 flex flex-col gap-2"><Button className="min-h-12 rounded-xl" data-haptic="success" disabled={!editable} onClick={() => { const all = completed.map(() => true); setCompleted(() => all); commitExercise(all); }}><Check /> Marcar todas y guardar</Button><Button className="min-h-12 rounded-xl" disabled={!editable} onClick={() => commitExercise(completed)} variant="outline">Guardar sin marcar</Button><Button className="min-h-11 rounded-xl" onClick={() => setConfirmUnmarked(false)} variant="ghost">Cancelar</Button></div></DialogContent></Dialog>
      <WorkoutReview open={finishReview} onOpenChange={setFinishReview} items={review.workout.exercises.map((item, index) => ({ ...item, name: getExerciseDisplayName(item.name, sessionExercises[index]?.catalogId) }))} sets={reviewSets} minutes={reviewMinutes} onSelect={jumpToExercise} onFinish={finishWorkout} disabled={!editable} dark={dark} />
      {notice ? <p aria-live="polite" className="motion-notice rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200">{notice}</p> : null}
      <section className="mb-6 flex items-end justify-between gap-4">
        <div><p className="mb-1 capitalize text-sm font-medium text-muted-foreground">{today} · Semana {state.week}</p><h1 className="page-title">Entrenamiento de hoy</h1></div>

      </section>

      <section className="summary-card">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto">{routineIds.map((id) => <button key={id} aria-pressed={routineId === id} className={`min-h-11 shrink-0 rounded-lg px-3 text-xs font-bold ${routineId === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} onClick={() => { onClearUndo(); setRoutineId(id); setExerciseIndex(0); }} type="button">{completedPlanSlots(state.workoutLogs).has(`${state.week}:${id}`) ? '✓ ' : ''}{sessionById.get(id)?.name ?? id}</button>)}</div>
            <span className="hidden text-xs font-bold uppercase text-muted-foreground sm:inline">{weekPlan.block}</span>
          </div>
          <p className="font-semibold">{sessionExercises.length} ejercicios · 45–55 min</p>
          <p className="mt-1 text-sm text-muted-foreground">{weekPlan.deload ? 'Descarga: menos series, técnica limpia y esfuerzo cómodo.' : 'Técnica cómoda. Deja las repeticiones previstas en reserva.'}</p>
        </div>
        <ProgressRing value={sessionExercises.length ? completedInRoutine / sessionExercises.length * 100 : 0} label={`${completedInRoutine}/${sessionExercises.length}`} description="Ejercicios completados" />
      </section>

      <WarmupCard state={state} updateState={updateState} />

      <section aria-label="Ejercicios de la sesión" className="sticky top-2 z-10">
        <ExercisePickerSheet open={showExercises} onOpenChange={setShowExercises} current={exerciseIndex} onSelect={jumpToExercise} dark={dark} items={sessionExercises.map(item => ({ name: getExerciseDisplayName(item.name, item.catalogId), status: doneNames.has(item.name) ? 'done' : routineLogs.find(log => log.exercise === item.name)?.skipped ? 'skipped' : 'pending' }))} />
      </section>

      <article ref={exerciseCard} className={`exercise-card ${saved ? 'ring-2 ring-emerald-500/40' : ''}`}><MotionSurface motionKey={exercise.name}>
        <div className="border-b border-border p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><p className="eyebrow">Ejercicio {exerciseIndex + 1} de {sessionExercises.length}</p><h2 className="text-2xl font-bold tracking-tight">{getExerciseDisplayName(exercise.name, exercise.catalogId)}</h2></div>
            <ExercisePreview key={exercise.name} image={exercise.image || details?.image} name={getExerciseDisplayName(exercise.name, exercise.catalogId)} description={description} />
          </div>
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{conciseExerciseText(description).join(' ')}</p>
          <div className="text-sm"><strong>Objetivo</strong> {exercise.target}</div>
        </div>

        <div className="p-4 sm:p-5">
          {exercise.unit !== 'reps' ? <div className="mb-5"><p className="control-label">Carga para todas las series</p><Stepper label={`Carga de ${exercise.name}`} value={load} onChange={setLoad} step={exercise.unit === 'kg' ? 0.5 : exercise.increment} suffix={exercise.unit} /></div> : null}
          <div className="mb-3 flex items-center justify-between gap-3"><span className="control-label">Series</span><Button className="min-h-11 rounded-xl" data-haptic="success" variant="outline" aria-pressed={completed.length > 0 && completed.every(Boolean)} onClick={() => toggleSets(completed.map(() => !completed.every(Boolean)), false)}><Check className="size-4" />{completed.every(Boolean) ? 'Desmarcar todas' : 'Marcar todas'}</Button></div>
          <div className="set-grid set-grid-header"><span>Serie</span><span>Repeticiones</span><span>Hecho</span></div>
          <div className="space-y-2.5">
            {setReps.map((reps, index) => (
              <div key={index} className="set-grid completion-row rounded-xl" data-complete={completed[index]}>
                <span className="text-center text-sm font-bold text-muted-foreground">{index + 1}</span>
                <div className="min-w-0"><Stepper label={`Repeticiones, serie ${index + 1}`} value={reps} onChange={(value) => setSetReps((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))} />{lastLog?.sets[index]?.done ? <div className="mt-1 text-center"><GhostPerformance load={exercise.unit === 'reps' ? 0 : load} reps={reps} previousLoad={exercise.unit === 'reps' ? 0 : lastLog.load} previousReps={lastLog.sets[index].reps} unit={exercise.unit === 'reps' ? '' : exercise.unit} /></div> : null}</div>
                <Checkbox aria-label={`Serie ${index + 1} hecha`} checked={completed[index]} className="size-12 justify-self-end rounded-xl after:inset-0 data-checked:border-emerald-500 data-checked:bg-emerald-500 dark:data-checked:bg-emerald-500 [&_svg]:size-5" onCheckedChange={(checked) => toggleSets(completed.map((item, itemIndex) => itemIndex === index ? Boolean(checked) : item), Boolean(checked))} />
              </div>
            ))}
          </div>


          <div className="mt-4"><RestSettings enabled={rest.enabled} seconds={rest.seconds} disabled={!editable} onEnabledChange={value => { updateState(current => ({ ...current, restEnabled: value })); if (!value) onStopRest(); }} onSecondsChange={value => updateState(current => ({ ...current, restSeconds: value }))} /></div>
          <div className="mt-5"><OptionalSection title="Sensaciones del ejercicio" summary={`RIR ${rir} · ${pain ? `molestias ${pain}/10` : 'sin molestias'}`}><div className="grid gap-5 sm:grid-cols-2"><RirSelector disabled={!editable} onChange={setRir} value={rir} /><PainSlider disabled={!editable} value={pain} onChange={setPain} /></div></OptionalSection></div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-muted px-3.5 py-3 text-sm"><span className="flex items-center gap-2 font-medium"><StatusDot pain={pain} /> Recomendación</span><strong className="capitalize">{suggestion === 'subir' ? `subir a ${load + exercise.increment} ${exercise.unit}` : suggestion}</strong></div>

          <AnimatedDisclosure id="exercise-notes" open={showNotes}><textarea aria-label="Notas rápidas" className="mt-4 min-h-20 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setNote(event.target.value)} placeholder="Técnica, sensaciones..." value={note} /></AnimatedDisclosure>
          <div className="mt-4 space-y-2">
            <Button className="h-14 w-full rounded-xl text-base font-bold shadow-sm" disabled={saved} data-haptic={completed.some(Boolean) ? 'success' : 'warning'} onClick={saveAndNext} size="lg">{saved ? <><Check /> Guardado</> : 'Guardar ejercicio'}</Button>
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] gap-2">
              <Button aria-label="Ejercicio anterior" className="h-14 w-full rounded-xl" disabled={exerciseIndex === 0} onClick={() => setExerciseIndex((index) => Math.max(0, index - 1))} size="icon" variant="outline"><ChevronLeft /></Button>
              <Button aria-label="Marcar como no completado y pasar al siguiente ejercicio" className="h-14 w-full min-w-0 rounded-xl px-3 text-sm font-semibold" onClick={skipExercise} size="sm" variant="outline"><ChevronRight className="size-4" /> No hecha</Button>
              <Button aria-label="Añadir nota" aria-expanded={showNotes} aria-controls="exercise-notes" className="h-14 w-full rounded-xl" onClick={() => setShowNotes((value) => !value)} size="icon" variant="outline"><MoreHorizontal /></Button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs font-medium text-muted-foreground">Las series se guardan en tu historial al guardar el ejercicio.</p>
        </div>
      </MotionSurface></article>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-3"><span className="icon-tile"><Check /></span><div className="min-w-0 flex-1"><strong className="block">{savedWorkout ? 'Entrenamiento registrado' : '¿Has terminado?'}</strong><small className="text-muted-foreground">{completedInRoutine} de {sessionExercises.length} ejercicios completados</small></div></div>
        <Button className="h-12 w-full rounded-xl font-bold" data-haptic="success" onClick={() => { let start = 0; try { start = Number(localStorage.getItem(sessionStartKey)); } catch { /* Optional. */ } setReviewMinutes(start ? Math.max(1, Math.round((Date.now() - start) / 60000)) : null); setFinishReview(true); }}><Check /> {savedWorkout ? 'Actualizar entrenamiento' : 'Finalizar entrenamiento'}</Button>
        {savedWorkout ? <output className="motion-notice mt-2 block text-center text-xs text-emerald-700 dark:text-emerald-300">Guardado en Progreso · Historial de entrenamientos</output> : null}
      </section>

      <button aria-expanded={showCardio} aria-controls="cardio-form" className="quick-card" onClick={() => setShowCardio((value) => !value)} type="button"><span className="icon-tile"><Wind /></span><span className="flex-1 text-left"><strong className="block">Registrar actividad</strong><small className="text-muted-foreground">Cardio, caminata o clase</small></span><Plus className={`transition ${showCardio ? 'rotate-45' : ''}`} /></button>
      <AnimatedDisclosure id="cardio-form" open={showCardio}><CardioForm updateState={updateState} /></AnimatedDisclosure>
    </div>
  );
}

function WarmupCard({ state, updateState }: { state: AppState; updateState: (updater: (state: AppState) => AppState) => void }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const keys = warmup.map((item) => `${localDateKey()}:${item}`);
  return (
    <section className="rounded-2xl border border-border bg-card">
      <button aria-expanded={open} aria-controls={panelId} className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen((value) => !value)} type="button"><span className="icon-tile"><RotateCcw /></span><span className="flex-1"><strong className="block">Calentamiento rápido</strong><small className="text-muted-foreground">{keys.filter((key) => state.warmupDone.includes(key)).length}/{warmup.length} completado</small></span><ChevronRight className={`text-muted-foreground transition ${open ? 'rotate-90' : ''}`} /></button>
      <AnimatedDisclosure id={panelId} open={open}><div className="space-y-1 border-t border-border p-3">{warmup.map((item, index) => { const key = keys[index]; return <label key={item} className="flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-muted"><Checkbox checked={state.warmupDone.includes(key)} onCheckedChange={(checked) => updateState((current) => ({ ...current, warmupDone: checked ? [...current.warmupDone.filter((done) => done !== key), key] : current.warmupDone.filter((done) => done !== key) }))} /><span className="text-sm font-medium">{item}</span></label>; })}</div></AnimatedDisclosure>
    </section>
  );
}

function CardioForm({ updateState }: { updateState: (updater: (state: AppState) => AppState) => void }) {
  const [type, setType] = useState('Caminata'); const [minutes, setMinutes] = useState(0); const [steps, setSteps] = useState<number | null>(null); const [rpe, setRpe] = useState(0); const [distance, setDistance] = useState<number | null>(null); const [saved, setSaved] = useState(false);
  const [stepLength, setStepLength] = useState(70);
  const [stepsEstimated, setStepsEstimated] = useState(false);
  const effectiveSteps = stepsEstimated ? activityEstimates(minutes, distance ?? 0, stepLength).steps : steps;
  const isClass = ['Pilates', 'Spinning', 'Body Pump', 'Total Training'].includes(type);
  const save = () => { if (minutes < 1) return; const log: CardioLog = { id: uid(), date: new Date().toISOString(), type, minutes, ...(!isClass && distance !== null ? { distance } : {}), ...(!isClass && effectiveSteps !== null ? { steps: effectiveSteps, ...(stepsEstimated ? { stepsEstimated: true, stepLengthCm: stepLength } : {}) } : {}), ...(rpe > 0 ? { rpe } : {}) }; updateState((state) => ({ ...state, cardioLogs: [...state.cardioLogs, log] })); setSaved(true); };
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-5"><ActivityTypePicker value={type} onChange={value => { setType(value); setSteps(effectiveSteps); setStepsEstimated(false); setSaved(false); }} />
      <DurationPicker value={minutes} onChange={value => { setMinutes(value); setSaved(false); }} />
      {!isClass ? <OptionalSection title="Distancia y pasos" summary={[distance !== null ? `${distance} km` : '', effectiveSteps !== null ? `${effectiveSteps} pasos${stepsEstimated ? ' estimados' : ''}` : ''].filter(Boolean).join(' · ') || 'Añadir datos de la cinta o del reloj'}><div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2"><div><p className="control-label">Distancia</p><Stepper optional label="Distancia en km" value={distance} onChange={value => { setDistance(value); setSaved(false); }} step={0.5} suffix="km" /></div><div><p className="control-label">Pasos</p><Stepper optional label="Pasos" value={effectiveSteps} onChange={value => { setSteps(value); setStepsEstimated(false); setSaved(false); }} step={500} /></div></div><ActivityEstimates minutes={minutes} distance={distance ?? 0} walking={type === 'Caminata'} stepLength={stepLength} onStepLengthChange={value => { setStepLength(value); setSaved(false); }} estimated={stepsEstimated} onUseSteps={value => { setSteps(value); setStepsEstimated(true); setSaved(false); }} /></OptionalSection> : null}
      <OptionalSection title="Sensaciones" summary={rpe ? `Esfuerzo ${rpe}/10` : '¿Cómo te has sentido? · opcional'}><EffortSelector value={rpe} onChange={value => { setRpe(value); setSaved(false); }} /></OptionalSection></div>
      <Button className="mt-4 h-12 w-full rounded-xl font-bold" disabled={minutes < 1 || saved} onClick={save}>{saved ? <><Check /> Guardado</> : <><Save /> Guardar actividad</>}</Button>
    </section>
  );
}

function PlanView({ state, updateState, onStartSession }: { state: AppState; updateState: (updater: (state: AppState) => AppState) => void; onStartSession: (week: number, routine: string) => void }) {
  const [editing, setEditing] = useState<Session | null>(null);
  const [building, setBuilding] = useState(false);
  const [periodDraft, setPeriodDraft] = useState<PlanPeriod | null>(null);
  const [confirmDeletePeriod, setConfirmDeletePeriod] = useState(false);
  const [openPeriodMenu, setOpenPeriodMenu] = useState<string | null>(null);
  const [viewWeek, setViewWeek] = useState(state.week);
  const [deletingSession, setDeletingSession] = useState<Session | null>(null);
  const weekPlan = state.plan.find((week) => week.week === viewWeek) ?? state.plan[0];
  const activePeriod = state.periods.find((period) => period.id === weekPlan?.periodId) ?? (() => {
    if (!weekPlan) return undefined;
    let start = 1;
    return state.periods.find((period) => {
      const matches = weekPlan.week >= start && weekPlan.week < start + period.durationWeeks;
      start += period.durationWeeks;
      return matches;
    });
  })();
  const assigned = new Set(weekPlan?.routines ?? []);

  const changePeriods = (transform: (periods: PlanPeriod[]) => PlanPeriod[]) => updateState((current) => {
    const selected = current.plan.find((week) => week.week === current.week);
    const periods = transform(current.periods);
    const plan = weeksFromPeriods(periods);
    const matchingWeek = selected ? plan.find((week) => week.periodId === selected.periodId && week.periodWeek === selected.periodWeek) : undefined;
    const lastWeekInPeriod = selected ? plan.filter((week) => week.periodId === selected.periodId).at(-1) : undefined;
    const week = matchingWeek?.week ?? lastWeekInPeriod?.week ?? Math.min(current.week, plan.length || 1);
    return { ...current, periods, plan, week };
  });

  const openPeriodEditor = (period?: PlanPeriod) => setPeriodDraft(period ? { ...period, routines: [...period.routines] } : {
    id: uid(), name: '', durationWeeks: 4, routines: [], cardio: 'Por definir', walks: 'Por definir', mobility: 'Por definir', optionalClass: '', deload: false,
  });

  const savePeriod = () => {
    if (!periodDraft?.name.trim()) return;
    const period = { ...periodDraft, name: periodDraft.name.trim(), durationWeeks: Math.max(1, Math.min(52, Math.floor(periodDraft.durationWeeks) || 1)) };
    changePeriods((current) => current.some((item) => item.id === period.id)
      ? current.map((item) => item.id === period.id ? period : item)
      : [...current, period]);
    if (!state.planName.trim()) updateState((current) => ({ ...current, planName: 'Mi plan' }));
    setPeriodDraft(null);
  };

  const deletePeriod = () => {
    if (!periodDraft) return;
    changePeriods((periods) => periods.filter((period) => period.id !== periodDraft.id));
    setConfirmDeletePeriod(false);
    setPeriodDraft(null);
  };

  const saveSession = (session: Session) => {
    updateState((current) => {
      const exists = current.sessions.some((item) => item.id === session.id);
      const sessions = exists ? current.sessions.map((item) => item.id === session.id ? session : item) : [...current.sessions, session];
      const selectedWeek = current.plan.find((week) => week.week === viewWeek);
      const periods = !exists && selectedWeek ? current.periods.map((period) => period.id === selectedWeek.periodId ? { ...period, routines: [...new Set([...period.routines, session.id])] } : period) : current.periods;
      return { ...current, sessions, periods, plan: periods === current.periods ? current.plan : weeksFromPeriods(periods) };
    });
    setBuilding(false);
    setEditing(null);
  };

  const setAssigned = (session: Session, include: boolean) => {
    if (!activePeriod) return;
    changePeriods((periods) => periods.map((period) => period.id !== activePeriod.id ? period : {
      ...period,
      routines: include ? [...new Set([...period.routines, session.id])] : period.routines.filter((id) => id !== session.id),
    }));
  };

  const removeSession = (id: string) => {
    updateState((current) => {
      const periods = current.periods.map((period) => ({ ...period, routines: period.routines.filter((routine) => routine !== id) }));
      return { ...current, sessions: current.sessions.filter((session) => session.id !== id), periods, plan: weeksFromPeriods(periods) };
    });
  };

  if (building) return <SessionBuilder initialSession={editing ?? undefined} onCancel={() => { setBuilding(false); setEditing(null); }} onSave={saveSession} />;

  return (
    <div>
      <div className="section-heading"><div><p className="eyebrow">Tu estructura de entrenamiento</p><h1 className="page-title">Plan</h1></div></div>
      <label className="mb-4 block"><span className="control-label">Nombre del plan</span><input aria-label="Nombre del plan" className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base font-semibold" onChange={(event) => updateState((current) => ({ ...current, planName: event.target.value }))} placeholder="Por ejemplo, Preparación física" value={state.planName} /></label>

      {periodDraft ? <section className="mb-4 rounded-2xl border border-primary/40 bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">{state.periods.some((period) => period.id === periodDraft.id) ? 'Editar tramo' : 'Nuevo tramo'}</h2><Button aria-label="Cancelar" className="size-10 rounded-xl" onClick={() => setPeriodDraft(null)} size="icon" variant="ghost"><X /></Button></div>
        <label className="block"><span className="control-label">Nombre del tramo</span><input aria-label="Nombre del tramo" className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3" onChange={(event) => setPeriodDraft((current) => current ? { ...current, name: event.target.value } : current)} placeholder="Ej. Base general" value={periodDraft.name} /></label>
        <div className="mt-4 grid grid-cols-2 items-center gap-3"><fieldset><legend className="control-label">Duración (semanas)</legend><Stepper label="Duración en semanas" value={periodDraft.durationWeeks} min={1} onChange={value => setPeriodDraft(current => current ? { ...current, durationWeeks: Math.min(52, value) } : current)} /></fieldset><div className="mt-5 flex min-h-12 items-center gap-2 text-sm font-medium"><Checkbox id="period-deload" checked={Boolean(periodDraft.deload)} onCheckedChange={(checked) => setPeriodDraft((current) => current ? { ...current, deload: Boolean(checked) } : current)} /><label htmlFor="period-deload">Descarga</label></div></div>
        <div className="mt-4 flex gap-2">{state.periods.some((period) => period.id === periodDraft.id) ? <Button className="h-12 flex-1 rounded-xl text-red-700 hover:bg-red-500/10 dark:text-red-300" onClick={() => setConfirmDeletePeriod(true)} variant="outline"><Trash2 /> Eliminar</Button> : null}<Button className="h-12 flex-1 rounded-xl font-bold" disabled={!periodDraft.name.trim() || periodDraft.durationWeeks < 1} onClick={savePeriod}><Save /> Guardar tramo</Button></div>
      </section> : null}

      <Dialog open={confirmDeletePeriod} onOpenChange={setConfirmDeletePeriod}><DialogContent><DialogTitle>¿Eliminar este tramo?</DialogTitle><DialogDescription>Se quitarán sus semanas de la estructura del plan. El historial de entrenamientos y las sesiones guardadas no se borrarán.</DialogDescription><div className="mt-4 flex justify-end gap-2"><Button onClick={() => setConfirmDeletePeriod(false)} variant="outline">Cancelar</Button><Button className="bg-red-600 text-white hover:bg-red-700" onClick={deletePeriod}>Eliminar tramo</Button></div></DialogContent></Dialog>

      {state.periods.length === 0 ? <section className="rounded-2xl border border-dashed border-border bg-card p-5 text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-muted text-primary"><CalendarDays /></span><h2 className="mt-3 font-bold">Tu plan empieza con un tramo</h2><p className="mt-1 text-sm text-muted-foreground">Ponle un nombre, define su duración y asígnale tus sesiones.</p><Button className="mt-4 h-12 rounded-xl font-bold" onClick={() => openPeriodEditor()}><Plus /> Crear primer tramo</Button></section> : null}

      {weekPlan && activePeriod ? <>
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">{weekPlan.week}</span><div className="min-w-0 flex-1"><p className="eyebrow">Semana {weekPlan.periodWeek} de {activePeriod.durationWeeks}</p><h2 className="truncate font-bold">{activePeriod.name}</h2></div>{activePeriod.deload ? <span className="rounded-lg bg-amber-400/20 px-2 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">DESCARGA</span> : null}</div>
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">{state.plan.filter((week) => week.periodId === activePeriod.id).map((week) => <button key={week.week} aria-label={`Ver semana ${week.week}${week.week === state.week ? ', activa' : ''}`} aria-pressed={week.week === weekPlan.week} className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm font-bold ${week.week === weekPlan.week ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}`} onClick={() => setViewWeek(week.week)} type="button">{week.periodWeek}</button>)}</div>
          <p className="mt-3 text-sm text-muted-foreground">{activePeriod.cardio}</p><p className="mt-1 text-xs text-muted-foreground">Caminatas: {activePeriod.walks} · Movilidad: {activePeriod.mobility}</p>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-3"><h2 className="font-bold">Semana {weekPlan.week} · sesiones</h2><p className="text-xs text-muted-foreground">Puedes hacerlas en cualquier orden. {weekPlan.week === state.week ? 'Semana activa.' : `Semana activa: ${state.week}.`}</p></div>
          {weekPlan.routines.length ? <div className="space-y-2">{weekPlan.routines.map((id) => {
            const session = state.sessions.find((item) => item.id === id);
            if (!session) return null;
            const completed = completedPlanSlots(state.workoutLogs).has(`${weekPlan.week}:${id}`);
            return <div key={id} className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-background p-3"><span className={`grid size-10 shrink-0 place-items-center rounded-lg ${completed ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-primary'}`}>{completed ? <Check className="size-5" /> : <Dumbbell className="size-5" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{session.name}</strong><small className="text-muted-foreground">{completed ? 'Realizada' : `${session.exercises.length} ejercicios · pendiente`}</small></span><Button className="min-h-11 shrink-0 rounded-xl px-3" onClick={() => onStartSession(weekPlan.week, id)} variant={completed ? 'outline' : 'default'}>{completed ? 'Revisar' : 'Empezar'}</Button></div>;
          })}</div> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No hay sesiones asignadas a esta semana.</p>}
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-bold">Sesiones del tramo</h2><p className="text-xs text-muted-foreground">Estas rutinas se repiten cada semana del tramo.</p></div><Button aria-label="Crear sesión" className="size-11 shrink-0 rounded-xl" onClick={() => { setEditing(null); setBuilding(true); }} size="icon"><Plus /></Button></div>
          {state.sessions.length ? <div className="space-y-2">{state.sessions.map((session) => {
          const selected = assigned.has(session.id);
          const custom = !BASE_SESSION_IDS.has(session.id);
          return <div key={session.id} className={`flex min-h-[60px] items-center gap-3 rounded-xl border px-3 py-2 ${selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'}`}>
            <Checkbox aria-label={`${selected ? 'Quitar' : 'Añadir'} ${session.name} ${selected ? 'del' : 'al'} tramo ${activePeriod.name}`} checked={selected} onCheckedChange={(checked) => setAssigned(session, Boolean(checked))} />
            <button className="min-w-0 flex-1 text-left" onClick={() => { setEditing(session); setBuilding(true); }} type="button"><strong className="block truncate text-sm">{session.name}</strong><small className="text-muted-foreground">{session.exercises.length} ejercicios{custom ? '' : ' · plan base'}</small></button>
            <Button aria-label={`Editar ${session.name}`} className="size-11 shrink-0 rounded-lg" onClick={() => { setEditing(session); setBuilding(true); }} size="icon" variant="ghost"><Pencil className="size-4" /></Button>
            {custom ? <Button aria-label={`Eliminar ${session.name}`} className="size-11 shrink-0 rounded-lg text-muted-foreground hover:text-red-600" onClick={() => setDeletingSession(session)} size="icon" variant="ghost"><Trash2 className="size-4" /></Button> : null}
          </div>;
          })}</div> : <div className="rounded-xl border border-dashed border-border p-5 text-center"><p className="text-sm font-semibold">Aún no tienes sesiones</p><p className="mt-1 text-xs text-muted-foreground">Crea una rutina con tus ejercicios.</p><Button className="mt-3 h-11 rounded-xl" onClick={() => setBuilding(true)}><Plus /> Crear rutina</Button></div>}
        </section>
      </> : null}

      {state.periods.length > 0 ? <section className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold">Tramos</h2><p className="text-xs text-muted-foreground">{state.plan.length} semanas en total</p></div><Button className="h-10 rounded-xl" onClick={() => openPeriodEditor()}><Plus /> Añadir tramo</Button></div><div className="space-y-2">{state.periods.map((period) => {
        const weeks = state.plan.filter((week) => week.periodId === period.id);
        const selected = weeks.some((week) => week.week === weekPlan?.week);
        const routineNames = period.routines.map((id) => state.sessions.find((session) => session.id === id)?.name ?? id);
        return <div key={period.id} className={`flex items-center gap-3 rounded-xl border p-3 ${selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'}`}>
          <button className="min-w-0 flex-1 text-left" onClick={() => { if (weeks[0]) setViewWeek(weeks[0].week); }} type="button"><strong className="block truncate text-sm">{period.name}</strong><small className="text-muted-foreground">{period.durationWeeks} {period.durationWeeks === 1 ? 'semana' : 'semanas'} · {routineNames.length ? routineNames.join(' + ') : 'Sin sesiones asignadas'}{period.deload ? ' · Descarga' : ''}</small></button>
          <div className="relative shrink-0"><Button aria-label={`Más opciones de ${period.name}`} aria-expanded={openPeriodMenu === period.id} aria-haspopup="menu" className="size-10 rounded-lg" onClick={() => setOpenPeriodMenu((current) => current === period.id ? null : period.id)} size="icon" variant="ghost"><MoreHorizontal className="size-5" /></Button>{openPeriodMenu === period.id ? <div className="absolute right-0 top-11 z-20 min-w-40 rounded-xl border border-border bg-card p-1.5 shadow-xl" role="menu"><button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium hover:bg-muted" onClick={() => { setOpenPeriodMenu(null); openPeriodEditor(period); }} role="menuitem" type="button"><Pencil className="size-4" /> Editar</button><button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-red-700 hover:bg-red-500/10 dark:text-red-300" onClick={() => { setOpenPeriodMenu(null); setPeriodDraft({ ...period, routines: [...period.routines] }); setConfirmDeletePeriod(true); }} role="menuitem" type="button"><Trash2 className="size-4" /> Borrar</button></div> : null}</div>
        </div>;
      })}</div></section> : null}
      <Dialog open={Boolean(deletingSession)} onOpenChange={(open) => { if (!open) setDeletingSession(null); }}><DialogContent><DialogTitle>¿Eliminar esta sesión?</DialogTitle><DialogDescription>Se quitará de todos los tramos. Los entrenamientos registrados permanecerán en el historial.</DialogDescription><div className="mt-4 flex justify-end gap-2"><Button onClick={() => setDeletingSession(null)} variant="outline">Cancelar</Button><Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => { if (deletingSession) removeSession(deletingSession.id); setDeletingSession(null); }}>Eliminar sesión</Button></div></DialogContent></Dialog>
    </div>
  );
}

function SessionBuilder({ initialSession, onSave, onCancel }: { initialSession?: Session; onSave: (session: Session) => void; onCancel: () => void }) {
  const [name, setName] = useState(initialSession?.name ?? '');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Exercise[]>(initialSession?.exercises.map((exercise) => ({ ...exercise })) ?? []);
  const sections = useMemo(() => exerciseCatalogSections(query), [query]);
  const total = sections.reduce((count, section) => count + section.items.length, 0);
  const pickedNames = useMemo(() => new Set(picked.map((item) => item.name)), [picked]);

  const add = (item: CatalogExercise) => setPicked((current) => current.some((exercise) => exercise.name === item.name) ? current : [...current, { name: item.name, catalogId: item.id, target: `3×8–12 · RIR 2–3`, sets: 3, minReps: 8, maxReps: 12, minRir: 2, maxRir: 3, increment: 2.5, unit: 'kg' }]);
  const remove = (exerciseName: string) => setPicked((current) => current.filter((exercise) => exercise.name !== exerciseName));
  const save = () => { const trimmed = name.trim(); if (!trimmed || picked.length === 0) return; onSave({ id: initialSession?.id ?? uid(), name: trimmed, exercises: picked }); };

  return (
    <div className="session-builder">
      <div className="session-builder-settings">
      <div className="mb-5 flex items-center gap-3"><Button aria-label="Cancelar" className="size-11 rounded-xl" onClick={onCancel} size="icon" variant="outline"><X /></Button><div><p className="eyebrow">{initialSession ? 'Editar rutina' : 'Nueva rutina'}</p><h1 className="page-title">{initialSession ? 'Editar sesión' : 'Crear sesión'}</h1></div></div>
      <input aria-label="Nombre de la sesión" className="mb-4 h-12 w-full rounded-xl border border-border bg-background px-4 text-base font-medium outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setName(event.target.value)} placeholder="Nombre (p. ej. Empuje A)" value={name} />

      {picked.length ? <div className="mb-4 space-y-2">{picked.map((exercise) => (
        <div key={exercise.name} className="space-y-2 rounded-2xl border border-border bg-card p-3"><div className="flex items-center gap-3"><strong className="min-w-0 flex-1 text-sm">{getExerciseDisplayName(exercise.name, exercise.catalogId)}</strong><button aria-label={`Quitar ${exercise.name}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:text-red-600" onClick={() => remove(exercise.name)} type="button"><X className="size-4" /></button></div><ExercisePrescriptionEditor exercise={exercise} onChange={updated => setPicked(current => current.map(item => item.name === exercise.name ? updated : item))} /></div>
      ))}</div> : null}

      <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3"><Search className="size-4 text-muted-foreground" /><input aria-label="Buscar ejercicios" className="h-11 flex-1 bg-transparent text-sm outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en español o inglés…" value={query} /></div>

      </div>
      <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">{total} {total === 1 ? 'ejercicio' : 'ejercicios'}{query ? ` para “${query}”` : ''}</p>
      {!total ? <p className="p-4 text-sm text-muted-foreground">No hay ejercicios con ese nombre. Prueba con otro término en español o inglés.</p> : null}
      <SectionedExerciseCatalog key={query} sections={sections} renderExercise={item => { const added = pickedNames.has(item.name); const translated = getExerciseDisplayName(item.name, item.id); return (
        <div key={item.id} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${added ? 'border-emerald-500/50 bg-emerald-500/7' : 'border-border bg-card'}`}>
          <ExercisePreview image={item.image} name={translated} description={item.description} compact />
          <button aria-label={`${added ? 'Añadido' : 'Añadir'}: ${translated}`} aria-disabled={added} className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-primary" onClick={() => add(item)} type="button">
            <span className="min-w-0 flex-1"><strong className="block text-sm">{translated}</strong>{translated !== item.name ? <small className="block truncate text-xs text-muted-foreground">{item.name}</small> : null}</span>
            {added ? <Check className="size-5 shrink-0 text-emerald-600" /> : <Plus className="size-5 shrink-0 text-muted-foreground" />}
          </button>
        </div>
      ); }} />
      <div className="session-builder-actions"><Button className="h-14 w-full rounded-xl text-base font-bold shadow-sm" disabled={!name.trim() || picked.length === 0} onClick={save}><Save /> {initialSession ? 'Guardar cambios' : `Crear rutina (${picked.length})`}</Button></div>
    </div>
  );
}

function ProgressView({ editable, state, updateState }: { editable: boolean; state: AppState; updateState: (updater: (state: AppState) => AppState) => void }) {
  const [editingActivity, setEditingActivity] = useState<CardioLog | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<CardioLog | null>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutLog | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<WorkoutLog | null>(null);
  const workoutKeys = new Set(state.workoutLogs.filter(countsTowardPlan).map((workout) => workout.id));
  const legacyWorkoutKeys = new Set(state.exerciseLogs.filter((log) => !log.workoutId && log.sets.some((set) => set.done)).map((log) => `${new Date(log.date).toLocaleDateString('en-CA')}:${log.week}:${log.routine}`));
  const strengthSessions = new Set([...workoutKeys, ...legacyWorkoutKeys]).size;
  const cardioMinutes = state.cardioLogs.reduce((sum, log) => sum + log.minutes, 0);
  const steps = state.cardioLogs.reduce((sum, log) => sum + (log.steps ?? 0), 0);
  const totalWeeks = state.plan.length;
  const activeWeek = state.plan.find((week) => week.week === state.week);
  const planStatus = planProgress(state.plan, state.workoutLogs);
  const painFree = state.exerciseLogs.length ? Math.round((state.exerciseLogs.filter((log) => log.pain < 2).length / state.exerciseLogs.length) * 100) : 100;
  const activityDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index));
    const key = date.toLocaleDateString('en-CA');
    const workouts = state.workoutLogs.filter((log) => new Date(log.date).toLocaleDateString('en-CA') === key).length;
    const cardio = state.cardioLogs.filter((log) => new Date(log.date).toLocaleDateString('en-CA') === key).length;
    return { key, label: new Intl.DateTimeFormat('es-ES', { weekday: 'narrow' }).format(date), count: workouts + cardio };
  });
  const maxActivity = Math.max(1, ...activityDays.map((day) => day.count));
  const deleteWorkout = () => {
    if (!deletingWorkout) return;
    const logIds = new Set(deletingWorkout.exercises.flatMap((exercise) => exercise.logId ? [exercise.logId] : []));
    updateState((current) => ({ ...current, week: current.plan.some((week) => week.week === deletingWorkout.week && week.routines.includes(deletingWorkout.routine)) ? Math.min(current.week, deletingWorkout.week) : current.week, workoutLogs: current.workoutLogs.filter((workout) => workout.id !== deletingWorkout.id), exerciseLogs: current.exerciseLogs.filter((log) => !logIds.has(log.id)) }));
    setDeletingWorkout(null);
  };
  return (
    <div><div className="section-heading"><div><h1 className="page-title">Progreso</h1></div></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric icon={Dumbbell} label="Fuerza" value={`${strengthSessions}`} detail="sesiones" /><Metric icon={Timer} label="Actividad" value={`${cardioMinutes}`} detail="minutos" /><Metric icon={Footprints} label="Pasos" value={steps ? `${Math.round(steps / 1000)}k` : '0'} detail="pasos" /><Metric icon={HeartPulse} label="Sin molestias" value={`${painFree}%`} detail="ejercicios" /></div>
      <MeasurementTracker state={state} updateState={updateState} />
      <section className="mt-4 rounded-2xl border border-border bg-card p-5"><div className="mb-6"><h2 className="font-bold">Actividad · últimos 7 días</h2><p className="text-sm text-muted-foreground">Entrenamientos, cardio, caminatas y clases</p></div>{activityDays.some((day) => day.count > 0) ? <div className="flex h-40 items-end gap-3">{activityDays.map((day) => <div key={day.key} aria-label={`${day.count} actividades`} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-full w-full items-end"><div className="activity-bar w-full rounded-t-md bg-primary/75 transition-all" style={{ height: `${day.count ? Math.max(8, day.count / maxActivity * 100) : 0}%` }} /></div><span className="text-[10px] font-semibold capitalize text-muted-foreground">{day.label}</span></div>)}</div> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Aún no hay actividad esta semana.</p>}</section>
      {state.cardioLogs.length ? <section className="mt-4 rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Actividad registrada</h2><div className="mt-3 space-y-2">{[...state.cardioLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, showAllActivities ? undefined : 5).map(log => {
        const estimate = activityEstimates(log.minutes, log.distance ?? 0);
        return <details key={log.id} className="rounded-xl border border-border bg-background"><summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Wind className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{log.type}</strong><small className="text-muted-foreground">{new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(log.date))}</small></span><span className="shrink-0 text-sm font-semibold tabular-nums">{log.minutes} min</span><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></summary><div className="space-y-3 border-t border-border p-3"><div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">{log.distance ? <><span>{log.distance} km</span><span>{formatPace(estimate.paceSeconds)} min/km</span></> : null}{log.steps ? <span>{log.steps.toLocaleString('es-ES')} pasos{log.stepsEstimated ? ' estimados' : ''}</span> : null}{log.rpe ? <span>Esfuerzo {log.rpe}/10</span> : null}{log.heartRate ? <span>{log.heartRate} bpm</span> : null}</div><div className="flex gap-2 border-t border-border pt-3"><Button className="min-h-11 flex-1 rounded-xl" onClick={() => setEditingActivity(log)} variant="outline"><Pencil className="size-4" /> Editar</Button><Button className="min-h-11 rounded-xl text-red-700 dark:text-red-300" onClick={() => setDeletingActivity(log)} variant="outline"><Trash2 className="size-4" /> Borrar</Button></div></div></details>;
      })}</div>{state.cardioLogs.length > 5 ? <Button className="mt-3 min-h-11 w-full rounded-xl" variant="ghost" onClick={() => setShowAllActivities(value => !value)}>{showAllActivities ? 'Ver menos' : `Ver todas (${state.cardioLogs.length})`}</Button> : null}</section> : null}
      <section className="mt-4 rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Plan completado</h2><div className="mt-5 flex items-center gap-4"><ProgressRing className="size-20 text-lg" value={planStatus.total ? planStatus.done / planStatus.total * 100 : 0} label={`${planStatus.total ? Math.round(planStatus.done / planStatus.total * 100) : 0}%`} description="Plan completado" /><div><strong>{planStatus.done} de {planStatus.total} sesiones</strong><p className="mt-1 text-xs text-muted-foreground">{totalWeeks ? `Semana activa ${state.week} de ${totalWeeks} · ${activeWeek?.block ?? ''}` : 'Crea un plan para ver tu progresión.'}</p></div></div></section>
      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Historial de entrenamientos</h2><p className="text-sm text-muted-foreground">Sesiones que has finalizado</p></div><span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold tabular-nums">{state.workoutLogs.length}</span></div>
        {state.workoutLogs.length ? <div className="space-y-2">{[...state.workoutLogs].sort((a, b) => b.date.localeCompare(a.date)).map((workout) => {
          const completed = workout.exercises.filter((item) => item.status === 'done').length;
          const partial = workout.exercises.filter((item) => item.status === 'partial').length;
          const dateLabel = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(workout.date));
          return <details key={workout.id} className="rounded-xl border border-border bg-background"><summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Dumbbell className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block truncate">{workout.routineName}</strong><small className="text-muted-foreground">{dateLabel} · Semana {workout.week}</small></span><span className="text-right text-xs font-semibold text-muted-foreground">{completed}/{workout.exercises.length}<small className="block">hechos{partial ? ` · ${partial} parciales` : ''}</small></span><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></summary><div className="space-y-2 border-t border-border p-3"><ul className="space-y-1">{workout.exercises.map((item) => <li key={item.name} className="flex items-center justify-between gap-3 text-sm"><span>{item.name}</span><span className={item.status === 'done' ? 'text-emerald-700 dark:text-emerald-300' : item.status === 'partial' ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}>{item.status === 'done' ? 'Completado' : item.status === 'partial' ? 'Parcial' : item.status === 'skipped' ? 'No completado' : 'Pendiente'}</span></li>)}</ul>{workout.notes ? <p className="rounded-lg bg-muted p-3 text-sm">{workout.notes}</p> : null}<div className="flex gap-2 border-t border-border pt-3"><Button className="min-h-11 flex-1 rounded-xl" onClick={() => setEditingWorkout(workout)} variant="outline"><Pencil className="size-4" /> Editar</Button><Button className="min-h-11 rounded-xl text-red-700 dark:text-red-300" onClick={() => setDeletingWorkout(workout)} variant="outline"><Trash2 className="size-4" /> Borrar</Button></div></div></details>;
        })}</div> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Al finalizar una sesión desde “Hoy”, aparecerá aquí junto con sus ejercicios y estado.</p>}
      </section>
      {editingActivity ? <ActivityHistoryEditor key={editingActivity.id} activity={editingActivity} editable={editable && state.cardioLogs.some(log => log.id === editingActivity.id)} dark={state.theme === 'dark' || (state.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)} onSave={edited => updateState(current => applyActivityEdit(current, editingActivity.id, edited))} onClose={() => setEditingActivity(null)} onDelete={() => { setDeletingActivity(editingActivity); setEditingActivity(null); }} /> : null}
      {deletingActivity ? <ActivityDeleteDialog editable={editable} dark={state.theme === 'dark' || (state.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)} onClose={() => setDeletingActivity(null)} onConfirm={() => { updateState(current => deleteActivity(current, deletingActivity.id)); setDeletingActivity(null); }} /> : null}
      {editingWorkout ? <WorkoutHistoryEditor editable={editable} key={editingWorkout.id} state={state} workout={editingWorkout} onSave={updateState} onClose={() => setEditingWorkout(null)} /> : null}
      <Dialog open={Boolean(deletingWorkout)} onOpenChange={(open) => { if (!open) setDeletingWorkout(null); }}><DialogContent><DialogTitle>¿Borrar este entrenamiento?</DialogTitle><DialogDescription>Se eliminará esta sesión y los registros de ejercicios vinculados. No se puede deshacer.</DialogDescription><div className="mt-4 flex justify-end gap-2"><Button onClick={() => setDeletingWorkout(null)} variant="outline">Cancelar</Button><Button className="bg-red-600 text-white hover:bg-red-700" onClick={deleteWorkout}><Trash2 /> Borrar</Button></div></DialogContent></Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-border bg-card p-4"><span className="mb-4 grid size-9 place-items-center rounded-lg bg-muted text-primary"><Icon className="size-4" /></span><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value} <small className="text-xs font-medium text-muted-foreground">{detail}</small></p></div>; }
function MobilityView({ state, updateState }: { state: AppState; updateState: (updater: (state: AppState) => AppState) => void }) {
  const [mode, setMode] = useState<'corta' | 'larga'>('corta');
  const [selected, setSelected] = useState<string | null>(null);
  const items = mode === 'corta' ? mobility.slice(0, 5) : mobility.slice(5);
  const keys = items.map(([name]) => `${localDateKey()}:${mode}-${name}`);
  const completedCount = keys.filter((key) => state.mobilityDone.includes(key)).length;
  const selectedItem = mobility.find(([name]) => name === selected);
  const selectedKey = selected ? `${localDateKey()}:${mobility.slice(0, 5).some(([name]) => name === selected) ? 'corta' : 'larga'}-${selected}` : '';
  const selectedDone = state.mobilityDone.includes(selectedKey);
  const toggleItem = (key: string) => updateState((current) => ({ ...current, mobilityDone: current.mobilityDone.includes(key) ? current.mobilityDone.filter((item) => item !== key) : [...current.mobilityDone, key] }));
  return (
    <div><div className="section-heading"><div><p className="eyebrow">5–10 minutos</p><h1 className="page-title">Movilidad</h1></div></div>
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-muted p-1"><button aria-pressed={mode === 'corta'} className={`min-h-11 rounded-lg text-sm font-bold ${mode === 'corta' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`} onClick={() => setMode('corta')} type="button">Rutina corta</button><button aria-pressed={mode === 'larga'} className={`min-h-11 rounded-lg text-sm font-bold ${mode === 'larga' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`} onClick={() => setMode('larga')} type="button">Rutina larga</button></div>
      <div className="mb-3 flex items-center justify-between gap-3"><p aria-live="polite" className="text-sm font-medium text-muted-foreground">{completedCount} de {items.length} completados</p><Button aria-label={`Reiniciar rutina ${mode}`} className="min-h-11 rounded-xl px-3" disabled={completedCount === 0} onClick={() => updateState((current) => ({ ...current, mobilityDone: resetMobilityKeys(current.mobilityDone, keys) }))} variant="outline"><RotateCcw className="size-4" /> Reiniciar</Button></div>
      <div className="space-y-3">{items.map(([name, dose, area], index) => { const key = keys[index]; const done = state.mobilityDone.includes(key); return <div key={name} className={`flex min-h-20 items-center gap-1 rounded-2xl border p-2 text-left transition ${done ? 'border-emerald-500/40 bg-emerald-500/7' : 'border-border bg-card'}`}><button aria-label={`${done ? 'Desmarcar' : 'Marcar'} ${name}`} aria-pressed={done} className={`grid size-12 shrink-0 place-items-center rounded-xl ${done ? 'bg-emerald-500 text-white' : 'bg-muted text-primary'}`} onClick={() => toggleItem(key)} type="button">{done ? <Check /> : <span className="text-sm font-bold">{index + 1}</span>}</button><button aria-label={`Ver cómo hacer ${name}`} className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 text-left" onClick={() => setSelected(name)} type="button"><span className="min-w-0 flex-1"><strong className="block text-sm">{name}</strong><small className="text-muted-foreground">{dose} · {area}</small></span><ChevronRight className="size-5 shrink-0 text-muted-foreground" /></button></div>; })}</div>
      <div className="mt-5 flex gap-3 rounded-2xl border border-border bg-card p-4"><Info className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm text-muted-foreground"><strong className="text-foreground">Indicaciones:</strong> busca una tensión cómoda, nunca dolor. Si algo supera 3/10, reduce el rango o para.</p></div>
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl sm:max-w-[520px]"><DialogTitle>{selected}</DialogTitle><DialogDescription>{selectedItem?.[1]} · {selectedItem?.[2]}</DialogDescription>{selected && mobilityGuides[selected] ? <><div className="overflow-hidden rounded-2xl border border-border bg-muted/50"><MobilityIllustration id={mobilityGuides[selected].id} name={selected} /></div><p className="text-xs text-muted-foreground">Postura de referencia. Muévete en un rango cómodo y sin dolor.</p><ol className="space-y-3">{mobilityGuides[selected].steps.map((step, index) => <li key={index} className="flex gap-3 text-sm leading-relaxed"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">{index + 1}</span><span>{step}</span></li>)}</ol><Button className="mt-2 h-12 w-full rounded-xl font-bold" onClick={() => { toggleItem(selectedKey); setSelected(null); }} variant={selectedDone ? 'outline' : 'default'}>{selectedDone ? 'Marcar como pendiente' : <><Check className="size-4" /> Marcar como hecho</>}</Button></> : null}</DialogContent></Dialog>
    </div>
  );
}

function ProfileView({ editable, state, updateState, user, cloudReady, authBusy, authError, onGoogleLogin, onLogout }: { editable: boolean; state: AppState; updateState: (updater: (state: AppState) => AppState) => void; user: FirebaseUser | null; cloudReady: boolean; authBusy: boolean; authError: string; onGoogleLogin: () => void; onLogout: () => void }) {
  const rest = restPreferences(state);
  const exportBackup = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `base-backup-${localDateKey()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div><div className="section-heading"><div><h1 className="page-title">Perfil</h1><p className="mt-1 text-sm text-muted-foreground">Cuenta y apariencia</p></div></div>
      <section className="mb-4 rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Apariencia</h2><p className="mt-1 text-sm text-muted-foreground">Elige cómo se muestra la aplicación.</p><fieldset className="mt-4"><legend className="sr-only">Tema de la aplicación</legend><div className="grid grid-cols-3 gap-2">{([{ id: 'system', label: 'Sistema', icon: Monitor }, { id: 'light', label: 'Claro', icon: Sun }, { id: 'dark', label: 'Oscuro', icon: Moon }] as const).map(({ id, label, icon: Icon }) => <button key={id} disabled={!editable} aria-pressed={state.theme === id} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold transition-colors ${state.theme === id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground hover:bg-muted'}`} onClick={() => updateState((current) => ({ ...current, theme: id }))} type="button"><Icon className="size-4" />{label}</button>)}</div></fieldset></section>
      <section className="mt-4 rounded-2xl border border-border bg-card p-5"><h2 className="mb-3 font-bold">Descanso entre series</h2><RestSettings enabled={rest.enabled} seconds={rest.seconds} disabled={!editable} onEnabledChange={value => updateState(current => ({ ...current, restEnabled: value }))} onSecondsChange={value => updateState(current => ({ ...current, restSeconds: value }))} /><p className="mt-3 text-xs text-muted-foreground">Se guarda en tu cuenta y se comparte con tus dispositivos.</p></section>
      <section className="mt-4 rounded-2xl border border-border bg-card p-5"><PreferenceSwitch label="Vibración al interactuar" description="Vibraciones suaves al marcar, navegar y guardar, si tu dispositivo y navegador lo permiten." checked={state.haptics !== false} disabled={!editable} onCheckedChange={(checked) => updateState((current) => ({ ...current, haptics: checked }))} /><HapticCheck enabled={state.haptics !== false} /></section>
      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        {user ? <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">{(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><strong className="block truncate">{user.displayName || 'Cuenta de Google'}</strong><small className="block truncate text-muted-foreground">{user.email}</small></div><Button aria-label="Cerrar sesión" className="size-11 rounded-xl" disabled={authBusy} onClick={onLogout} size="icon" variant="outline"><LogOut /></Button></div> : <div><div className="mb-4 flex gap-3"><span className="icon-tile"><Cloud /></span><div><strong className="block">Cuenta</strong><small className="text-muted-foreground">Inicia sesión para sincronizar entre dispositivos.</small></div></div><Button className="h-12 w-full rounded-xl bg-white font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50" disabled={authBusy || !firebaseConfigured} onClick={onGoogleLogin}><span className="grid size-6 place-items-center rounded-full bg-white text-base font-black text-blue-600">G</span>{authBusy ? 'Conectando…' : 'Continuar con Google'}</Button>{authError ? <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-300">{authError}</p> : null}</div>}
      </section>
      <section className="mt-4 rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="icon-tile">{user && cloudReady ? <Cloud /> : <CloudOff />}</span><div><strong className="block">Sincronización</strong><small className="text-muted-foreground">{user && cloudReady ? 'Sincronizado con la cuenta activa' : user ? 'Firebase pendiente · copia local disponible' : firebaseConfigured ? 'Solo en este dispositivo hasta iniciar sesión' : 'Sincronización no disponible'}</small></div></div><span className={`size-2.5 rounded-full ${user && cloudReady ? 'bg-emerald-500' : 'bg-amber-400'}`} /></div></section>
      <section className="mt-4 rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Copia local</h2><p className="mt-2 text-sm text-muted-foreground">Firebase guarda tu plan y tu historial. Este navegador conserva una copia para consultarlos sin conexión. Para guardar cambios necesitas conexión.</p><p className="mt-2 text-sm">{state.plan.length} semanas · {state.sessions.length} rutinas · {state.workoutLogs.length} entrenamientos</p><Button className="mt-4 min-h-12 rounded-xl" onClick={exportBackup} variant="outline"><Download /> Descargar copia de seguridad</Button></section>
      <section aria-labelledby="app-version-title" className="mt-4 rounded-2xl border border-border bg-card p-5"><h2 id="app-version-title" className="font-bold">Versión de la app</h2><p className="mt-2 text-sm font-semibold">v{appRelease.version}<span className="font-normal text-muted-foreground"> · {appRelease.build}</span></p><p className="mt-1 text-sm text-muted-foreground">Fecha de versión: <time dateTime={appRelease.builtAt}>{appRelease.date}</time> (Madrid)</p></section>
    </div>
  );
}

export default function HomePage() {
  const [state, setState] = useState<AppState>(defaultState);
  const [tab, setTab] = useState<Tab>('today');
  const [hydrated, setHydrated] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [systemDark, setSystemDark] = useState(false);
  const [preferredRoutine, setPreferredRoutine] = useState('');
  const [trainingNotice, setTrainingNotice] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [restDeadline, setRestDeadline] = useState<number | null>(null);
  const [undo, setUndo] = useState<{ id: number; message: string; action: () => void } | null>(null);
  const stopRest = useCallback(() => setRestDeadline(null), []);
  const startRest = useCallback(() => setRestDeadline(Date.now() + restPreferences(state).seconds * 1000), [state]);
  useEffect(() => { if (state.restEnabled !== false) return; const timer = window.setTimeout(stopRest, 0); return () => window.clearTimeout(timer); }, [state.restEnabled, stopRest]);
  const dismissUndo = useCallback(() => setUndo(null), []);
  const offerUndo = useCallback((message: string, action: () => void) => setUndo({ id: Date.now(), message, action }), []);
  const loadSequence = useRef(0);
  const persistence = useRef<WorkoutPersistence | null>(null);
  const contentScroll = useRef<HTMLElement>(null);
  const scrollContentToTop = useCallback(() => {
    contentScroll.current?.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>({ local: 'saved', cloud: 'pending', canEdit: false, error: '' });

  const [viewDirection, setViewDirection] = useState<-1 | 0 | 1>(0);
  const selectView = useCallback((id: Tab, direction: -1 | 0 | 1 = 0) => {
    if (id !== tab) { setViewDirection(direction); setTab(id); }
    scrollContentToTop();
  }, [tab, scrollContentToTop]);
  const swipeHandlers = useSwipeNavigation({ views: navItems.map((item) => item.id), active: tab, onNavigate: selectView });

  useInteractionFeedback(state.haptics !== false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemDark(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    const scope = `${basePath}/`;
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker.getRegistration(scope).then((registration) => registration?.unregister());
      return;
    }

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (disposed) return;
      if (hadController) setUpdateAvailable(true);
      hadController = true;
    };
    const checkForUpdate = () => { if (document.visibilityState === 'visible') void registration?.update().catch(() => undefined); };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', checkForUpdate);
    const timer = window.setInterval(checkForUpdate, 60 * 60 * 1000);
    void navigator.serviceWorker.register(`${basePath}/sw.js`, { scope }).then((registered) => {
      if (disposed) return;
      registration = registered;
      checkForUpdate();
    }).catch(() => undefined);
    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', checkForUpdate);
      window.clearInterval(timer);
    };
  }, []);

  const updateState = useCallback((updater: (state: AppState) => AppState) => persistence.current?.update(updater), []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    const initialize = async () => {
      unsubscribe = await subscribeToAuth(async (user) => {
        if (cancelled) return;
        const sequence = ++loadSequence.current;
        setHydrated(false);
        setCloudReady(false);
        persistence.current?.dispose();
        persistence.current = null;
        setFirebaseUser(user);
        if (!user || user.isAnonymous) {
          if (cancelled || sequence !== loadSequence.current) return;
          setState(defaultState);
          setHydrated(true);
          return;
        }
        const store = new WorkoutPersistence({
          loadLocal: () => loadLocalState(user.uid),
          saveLocal: (value) => saveLocalState(value, user.uid),
          backup: (value, source) => backupLocalState(value, user.uid, source),
          loadCloud: () => loadFromFirebase(user.uid),
          saveCloud: (value, expectedVersion) => syncToFirebase(value, user.uid, expectedVersion),
          onChange: (value, status) => {
            if (cancelled || sequence !== loadSequence.current) return;
            setState(value);
            setPersistenceStatus(status);
            setCloudReady(status.cloud === 'synced');
            setSyncing(status.local === 'saving');
          },
        });
        persistence.current = store;
        await store.initialize();
        if (cancelled || sequence !== loadSequence.current) { store.dispose(); return; }
        setHydrated(true);
        void store.sync();
      });
      if (cancelled) unsubscribe();
    };
    void initialize().catch((error) => {
      setAuthError(error instanceof Error ? error.message : 'No se pudo conectar con Firebase.');
      setHydrated(true);
    });
    const retry = () => { void persistence.current?.sync(); };
    const timer = window.setInterval(retry, 30_000);
    window.addEventListener('online', retry);
    return () => {
      cancelled = true;
      unsubscribe?.();
      persistence.current?.dispose();
      window.clearInterval(timer);
      window.removeEventListener('online', retry);
    };
  }, []);

  useEffect(() => {
    if (!updateAvailable || authBusy || syncing || (firebaseUser && tab === 'today')) return;
    const timer = window.setTimeout(() => window.location.reload(), 1200);
    return () => window.clearTimeout(timer);
  }, [authBusy, firebaseUser, syncing, tab, updateAvailable]);

  useEffect(() => {
    if (!firebaseUser || firebaseUser.isAnonymous) return;
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({ name: 'log_walk', title: 'Registrar caminata', description: 'Registra una caminata con minutos y pasos en Base.', inputSchema: { type: 'object', properties: { minutes: { type: 'number', minimum: 1 }, steps: { type: 'number', minimum: 0 } }, required: ['minutes', 'steps'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: (input: unknown) => { if (!persistence.current?.status.canEdit) throw new Error('Conecta con Firebase antes de registrar una caminata.'); const value = input as { minutes?: number; steps?: number }; if (!Number.isFinite(value.minutes) || !Number.isFinite(value.steps) || Number(value.minutes) < 1 || Number(value.steps) < 0) throw new Error('Minutos o pasos no válidos'); const log: CardioLog = { id: uid(), date: new Date().toISOString(), type: 'Caminata', minutes: Number(value.minutes), distance: 0, steps: Number(value.steps), rpe: 4 }; updateState((current) => ({ ...current, cardioLogs: [...current.cardioLogs, log] })); return { status: 'saved', id: log.id }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [firebaseUser, updateState]);

  const handleGoogleLogin = async () => { setAuthBusy(true); setAuthError(''); try { await signInWithGoogle(); } catch (error) { const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''; setAuthError(code.includes('popup-closed') ? 'Se cerró la ventana antes de completar el acceso.' : code.includes('unauthorized-domain') ? 'Añade este dominio a los dominios autorizados de Firebase.' : 'No se pudo iniciar sesión. Inténtalo de nuevo.'); } finally { setAuthBusy(false); } };
  const handleLogout = async () => {
    setAuthBusy(true);
    setAuthError('');
    const previousCloudReady = cloudReady;
    ++loadSequence.current;
    setHydrated(false);
    setCloudReady(false);
    try {
      await persistence.current?.flushLocal();
      await signOutFirebase();
      try { await clearAppLocalData(); } catch { setAuthError('Sesión cerrada, pero no se pudieron borrar los borradores.'); }
    } catch {
      setAuthError('No se pudo cerrar la sesión.');
      setCloudReady(previousCloudReady);
      setHydrated(true);
    } finally {
      setAuthBusy(false);
    }
  };

  const startSession = (week: number, routine: string) => {
    setPreferredRoutine(routine);
    setTrainingNotice('');
    updateState((current) => ({ ...current, week }));
    setTab('today');
    scrollContentToTop();
  };

  const finishSession = (workout: WorkoutLog, exerciseLog?: ExerciseLog) => {
    const updatedWorkouts = [...state.workoutLogs.filter((item) => item.id !== workout.id), workout];
    const next = countsTowardPlan(workout) ? nextPlanSession(state.plan, updatedWorkouts, workout.week, workout.routine) : null;
    updateState((current) => ({
      ...current,
      week: next?.week ?? current.week,
      workoutLogs: [...current.workoutLogs.filter((item) => item.id !== workout.id), workout],
      exerciseLogs: exerciseLog ? [...current.exerciseLogs.filter((item) => item.id !== exerciseLog.id), exerciseLog] : current.exerciseLogs,
    }));
    if (next) {
      setPreferredRoutine(next.routine);
      const name = state.sessions.find((session) => session.id === next.routine)?.name ?? next.routine;
      setTrainingNotice(`Sesión registrada. Siguiente: ${name} · semana ${next.week}.`);
    } else {
      setTrainingNotice(countsTowardPlan(workout) ? 'Sesión registrada. No quedan sesiones pendientes en el plan.' : 'Entrenamiento guardado. Esta sesión sigue pendiente porque no hay ejercicios realizados.');
    }
    scrollContentToTop();
  };

  const content = tab === 'today' ? <TodayView editable={persistenceStatus.canEdit} key={`${state.week}:${preferredRoutine}`} state={state} updateState={updateState} onOpenSessions={() => setTab('plan')} preferredRoutine={preferredRoutine} onFinish={finishSession} notice={trainingNotice} onStartRest={startRest} onStopRest={stopRest} onOfferUndo={offerUndo} onClearUndo={dismissUndo} /> : tab === 'plan' ? <PlanView state={state} updateState={updateState} onStartSession={startSession} /> : tab === 'progress' ? <ProgressView editable={persistenceStatus.canEdit} state={state} updateState={updateState} /> : tab === 'mobility' ? <MobilityView state={state} updateState={updateState} /> : <ProfileView editable={persistenceStatus.canEdit} authBusy={authBusy} authError={authError} cloudReady={cloudReady} onGoogleLogin={handleGoogleLogin} onLogout={handleLogout} state={state} updateState={updateState} user={firebaseUser} />;

  if (!hydrated) return <main className="grid min-h-dvh place-items-center bg-background px-6 text-foreground"><div className="text-center"><span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><HeartPulse className="size-7" /></span><p className="text-sm text-muted-foreground">Comprobando acceso…</p></div></main>;
  if (!firebaseUser || firebaseUser.isAnonymous) return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10 text-foreground">
      <section className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><HeartPulse className="size-7" strokeWidth={2.4} /></span>
        <p className="eyebrow">Base</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Inicia sesión para continuar</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Tus sesiones y tu seguimiento se guardan de forma privada en tu cuenta.</p>
        <Button className="mt-6 h-12 w-full rounded-xl bg-white font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50" disabled={authBusy || !firebaseConfigured} onClick={handleGoogleLogin}><span className="grid size-6 place-items-center rounded-full bg-white text-base font-black text-blue-600">G</span>{authBusy ? 'Conectando…' : 'Continuar con Google'}</Button>
        {!firebaseConfigured ? <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">El acceso no está disponible: falta configurar Firebase.</p> : null}
        {authError ? <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-300">{authError}</p> : null}
      </section>
    </main>
  );

  const isDark = state.theme === 'dark' || (state.theme === 'system' && systemDark);

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="app-shell bg-background text-foreground" data-rest-active={restDeadline !== null}>
        <main ref={contentScroll} className="app-content" {...swipeHandlers}>
        <div className="mx-auto max-w-[1180px] px-4 pb-6 pt-5 sm:px-7">
          <header className="mb-7 flex items-center justify-between">
            <button className="flex items-center gap-3 text-left" onClick={() => setTab('today')} type="button"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><HeartPulse className="size-5" strokeWidth={2.4} /></span><span><span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Base</span><span className="block text-sm font-semibold">Seguimiento de entrenamiento</span></span></button>
            <div className="flex items-center gap-2"><SaveStatus status={persistenceStatus} /><Button aria-label="Abrir perfil" className="size-11 rounded-xl border-border bg-card text-foreground shadow-sm hover:bg-muted" onClick={() => setTab('profile')} size="icon" variant="outline"><CircleUserRound /></Button></div>
          </header>
          <MotionSurface className="mx-auto max-w-[760px]" motionKey={tab} direction={viewDirection}>
            {updateAvailable && tab === 'today' ? <output className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3"><span className="text-sm font-medium">Nueva versión disponible</span><Button className="min-h-10 shrink-0 rounded-lg" onClick={() => window.location.reload()} size="sm" variant="outline">Actualizar</Button></output> : null}
            {tab === 'timers' ? <div className="section-heading"><div><p className="eyebrow">Herramientas de entrenamiento</p><h1 className="page-title">Temporizadores</h1></div></div> : null}
            <div className={tab === 'timers' ? '' : 'hidden'}><WorkoutTimer /></div>
            {persistenceStatus.error ? <p role="alert" className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">{persistenceStatus.local === 'error' ? 'No se ha podido guardar en este dispositivo.' : 'No se ha confirmado el guardado en Firebase. Conservamos la copia local y reintentaremos la conexión.'} <span className="block text-xs">{persistenceStatus.error}</span></p> : null}
            {!persistenceStatus.canEdit && !persistenceStatus.error ? <output className="mb-4 block text-sm text-muted-foreground">Conectando con Firebase. La copia local se muestra en modo lectura.</output> : null}
            <fieldset disabled={!persistenceStatus.canEdit && tab !== 'profile'} className="min-w-0">
            {tab === 'timers' ? null : tab === 'profile' ? <ProfileView editable={persistenceStatus.canEdit} authBusy={authBusy} authError={authError} cloudReady={cloudReady} onGoogleLogin={handleGoogleLogin} onLogout={handleLogout} state={state} updateState={updateState} user={firebaseUser} /> : content}
            </fieldset>
          </MotionSurface>
        </div>
        </main>
          {undo ? <UndoNotice key={undo.id} message={undo.message} onDismiss={dismissUndo} onUndo={() => { if (persistenceStatus.canEdit) undo.action(); }} /> : null}

        {restDeadline !== null ? <RestDock key={restDeadline} deadline={restDeadline} onDismiss={stopRest} /> : null}
        <div className="bottom-nav"><div className="mx-auto max-w-[680px]"><LiquidNavigation items={navItems} active={tab} onSelect={selectView} /></div></div>
      </div>
    </div>
  );
}
