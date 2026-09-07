'use client';

import {
  Activity, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, CircleUserRound,
  Cloud, CloudOff, Dumbbell, Footprints, HeartPulse, History, Home, Info, LogOut, Moon,
  MoreHorizontal, Plus, RotateCcw, Save, Search, Sun, Timer, Trash2, TrendingUp, Wind, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { exerciseImageUrl, searchCatalog, type CatalogExercise } from '@/lib/exercise-catalog';
import { firebaseConfigured, loadFromFirebase, signInWithGoogle, signOutFirebase, subscribeToAuth, syncToFirebase, type FirebaseUser } from '@/lib/firebase';
import { mobility, warmup, type Exercise } from '@/lib/workout-data';
import { defaultState, loadLocalState, saveLocalState, seedAccount, SEED_SESSION_IDS, type AppState, type CardioLog, type ExerciseLog, type Session } from '@/lib/storage';

type Tab = 'today' | 'plan' | 'sessions' | 'progress' | 'mobility' | 'profile';

const navItems: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: 'today', label: 'Hoy', icon: Home },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'sessions', label: 'Sesiones', icon: Dumbbell },
  { id: 'progress', label: 'Progreso', icon: BarChart3 },
  { id: 'mobility', label: 'Movilidad', icon: Footprints },
  { id: 'profile', label: 'Perfil', icon: CircleUserRound },
];

const today = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function Stepper({ value, onChange, step = 1, min = 0, suffix }: { value: number; onChange: (value: number) => void; step?: number; min?: number; suffix?: string }) {
  return (
    <div className="flex h-12 items-center rounded-xl border border-border bg-background">
      <button aria-label="Reducir" className="grid h-full w-10 place-items-center text-xl font-medium text-muted-foreground active:bg-muted" onClick={() => onChange(Math.max(min, value - step))} type="button">−</button>
      <button className="min-w-12 flex-1 text-center text-base font-bold tabular-nums" type="button">{value}<small className="ml-1 font-medium text-muted-foreground">{suffix}</small></button>
      <button aria-label="Aumentar" className="grid h-full w-10 place-items-center text-xl font-medium text-muted-foreground active:bg-muted" onClick={() => onChange(value + step)} type="button">+</button>
    </div>
  );
}

function Segmented({ value, values, onChange, label, pain = false }: { value: number; values: number[]; onChange: (value: number) => void; label: string; pain?: boolean }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</legend>
      <div className="grid grid-flow-col gap-1.5">
        {values.map((item) => {
          const active = item === value;
          const painClass = pain && active ? (item >= 4 ? 'bg-red-500 text-white border-red-500' : item >= 2 ? 'bg-amber-400 text-amber-950 border-amber-400' : 'bg-emerald-500 text-white border-emerald-500') : '';
          return <button key={item} aria-pressed={active} className={`h-10 rounded-lg border text-sm font-bold transition active:scale-95 ${active ? painClass || 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'}`} onClick={() => onChange(item)} type="button">{item}{pain && item === 4 ? '+' : ''}</button>;
        })}
      </div>
    </fieldset>
  );
}

function StatusDot({ pain }: { pain: number }) {
  return <span className={`inline-block size-2.5 rounded-full ${pain >= 4 ? 'bg-red-500' : pain >= 2 ? 'bg-amber-400' : 'bg-emerald-500'}`} />;
}

const FALLBACK_EXERCISE: Exercise = { name: '', target: '', sets: 1, minReps: 0, maxReps: 0, increment: 1, unit: 'kg' };

function TodayView({ state, updateState }: { state: AppState; updateState: (updater: (state: AppState) => AppState) => void }) {
  const weekPlan = state.plan.find((week) => week.week === state.week) ?? state.plan[0];
  const routineIds = useMemo(() => weekPlan?.routines ?? [], [weekPlan]);
  const sessionById = useMemo(() => new Map(state.sessions.map((session) => [session.id, session])), [state.sessions]);
  const [routineId, setRoutineId] = useState<string>(routineIds[0] ?? '');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const sessionExercises = sessionById.get(routineId)?.exercises ?? [];
  const exercise = sessionExercises[exerciseIndex] ?? FALLBACK_EXERCISE;
  const lastLog = useMemo(() => state.exerciseLogs.findLast((log) => log.exercise === exercise.name), [exercise.name, state.exerciseLogs]);
  const [load, setLoad] = useState(lastLog?.load ?? (exercise.unit === 'reps' ? 0 : 20));
  const [setReps, setSetReps] = useState<number[]>(() => Array(exercise.sets).fill(exercise.maxReps));
  const [completed, setCompleted] = useState<boolean[]>(() => Array(exercise.sets).fill(false));
  const [rir, setRir] = useState(2);
  const [pain, setPain] = useState(0);
  const [note, setNote] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showCardio, setShowCardio] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const latest = state.exerciseLogs.findLast((log) => log.exercise === exercise.name);
    const timer = window.setTimeout(() => {
      setLoad(latest?.load ?? (exercise.unit === 'reps' ? 0 : 20));
      setSetReps(Array(exercise.sets).fill(exercise.maxReps));
      setCompleted(Array(exercise.sets).fill(false));
      setRir(2); setPain(0); setNote(''); setSaved(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [exercise.name, exercise.maxReps, exercise.sets, exercise.unit, state.exerciseLogs]);

  useEffect(() => {
    if (routineIds.length && !routineIds.includes(routineId)) {
      const timer = window.setTimeout(() => { setRoutineId(routineIds[0]); setExerciseIndex(0); }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [routineId, routineIds]);

  if (!weekPlan) return null;

  const suggestion: ExerciseLog['suggestion'] = pain >= 4 || rir < 1 || setReps.some((reps) => reps < exercise.minReps)
    ? 'bajar'
    : completed.every(Boolean) && setReps.every((reps) => reps >= exercise.maxReps) && rir >= 1
      ? 'subir' : 'mantener';

  const saveAndNext = () => {
    const log: ExerciseLog = { id: uid(), date: new Date().toISOString(), week: state.week, routine: routineId, exercise: exercise.name, load, sets: setReps.map((reps, index) => ({ reps, done: completed[index] })), rir, pain, note, suggestion };
    updateState((current) => ({ ...current, exerciseLogs: [...current.exerciseLogs, log] }));
    setSaved(true);
    window.setTimeout(() => {
      setExerciseIndex((current) => current < sessionExercises.length - 1 ? current + 1 : 0);
    }, 260);
  };

  const completedInRoutine = new Set(state.exerciseLogs.filter((log) => log.week === state.week && log.routine === routineId).map((log) => log.exercise)).size;

  return (
    <div className="space-y-4">
      <section className="mb-6 flex items-end justify-between gap-4">
        <div><p className="mb-1 capitalize text-sm font-medium text-muted-foreground">{today} · Semana {state.week}</p><h1 className="page-title">Entrenamiento de hoy</h1></div>
        <div className="hidden items-center gap-2 text-sm font-semibold text-muted-foreground sm:flex"><span className="size-2 rounded-full bg-emerald-500" /> Guardado</div>
      </section>

      <section className="summary-card">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex gap-1">{routineIds.map((id) => <button key={id} className={`rounded-md px-2.5 py-1 text-xs font-bold ${routineId === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} onClick={() => { setRoutineId(id); setExerciseIndex(0); }} type="button">{sessionById.get(id)?.name ?? id}</button>)}</div>
            <span className="hidden text-xs font-bold uppercase text-muted-foreground sm:inline">{weekPlan.block}</span>
          </div>
          <p className="font-semibold">{sessionExercises.length} ejercicios · 45–55 min</p>
          <p className="mt-1 text-sm text-muted-foreground">{weekPlan.deload ? 'Descarga: menos series, técnica limpia y esfuerzo cómodo.' : 'Técnica cómoda. Deja las repeticiones previstas en reserva.'}</p>
        </div>
        <div className="progress-ring">{completedInRoutine}/{sessionExercises.length}</div>
      </section>

      <WarmupCard state={state} updateState={updateState} />

      <article className={`exercise-card ${saved ? 'ring-2 ring-emerald-500/40' : ''}`}>
        <div className="border-b border-border p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><p className="eyebrow">Ejercicio {exerciseIndex + 1} de {sessionExercises.length}</p><h2 className="text-2xl font-bold tracking-tight">{exercise.name}</h2></div>
            <Button aria-label="Ver historial" className="size-11 rounded-xl" size="icon" variant="secondary"><History /></Button>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm"><span><strong>Objetivo</strong> {exercise.target}</span><span className="text-muted-foreground">Última carga: {lastLog ? `${lastLog.load} ${exercise.unit}` : 'sin datos'}</span></div>
          {lastLog ? <div className={`mt-3 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold ${lastLog.suggestion === 'subir' ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' : lastLog.suggestion === 'bajar' ? 'bg-red-500/12 text-red-700 dark:text-red-300' : 'bg-amber-400/15 text-amber-700 dark:text-amber-300'}`}><TrendingUp className="size-3.5" /> La última vez: {lastLog.suggestion}</div> : null}
        </div>

        <div className="p-4 sm:p-5">
          {exercise.unit !== 'reps' ? <div className="mb-5"><p className="control-label">Carga para todas las series</p><Stepper value={load} onChange={setLoad} step={exercise.increment} suffix={exercise.unit} /></div> : null}
          <div className="set-grid set-grid-header"><span>Serie</span><span>Repeticiones</span><span>Hecho</span></div>
          <div className="space-y-2.5">
            {setReps.map((reps, index) => (
              <div key={index} className="set-grid">
                <span className="text-center text-sm font-bold text-muted-foreground">{index + 1}</span>
                <Stepper value={reps} onChange={(value) => setSetReps((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))} />
                <button aria-label={`Marcar serie ${index + 1} como ${completed[index] ? 'pendiente' : 'hecha'}`} aria-pressed={completed[index]} className={`grid size-12 place-items-center justify-self-end rounded-xl border transition active:scale-95 ${completed[index] ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-background text-muted-foreground'}`} onClick={() => setCompleted((current) => current.map((item, itemIndex) => itemIndex === index ? !item : item))} type="button"><Check className="size-5" strokeWidth={3} /></button>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3"><Segmented label="RIR final" onChange={setRir} value={rir} values={[0, 1, 2, 3, 4]} /><Segmented label="Molestias 0–10" onChange={setPain} pain value={pain} values={[0, 1, 2, 3, 4]} /></div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-muted px-3.5 py-3 text-sm"><span className="flex items-center gap-2 font-medium"><StatusDot pain={pain} /> Recomendación</span><strong className="capitalize">{suggestion === 'subir' ? `subir a ${load + exercise.increment} ${exercise.unit}` : suggestion}</strong></div>

          {showNotes ? <textarea aria-label="Notas rápidas" className="mt-4 min-h-20 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setNote(event.target.value)} placeholder="Técnica, sensaciones..." value={note} /> : null}
          <div className="mt-4 flex gap-2">
            <Button aria-label="Ejercicio anterior" className="size-14 rounded-xl" disabled={exerciseIndex === 0} onClick={() => setExerciseIndex((index) => Math.max(0, index - 1))} size="icon" variant="outline"><ChevronLeft /></Button>
            <Button className="h-14 flex-1 rounded-xl text-base font-bold shadow-sm" onClick={saveAndNext} size="lg">{saved ? <><Check /> Guardado</> : <>Guardar y siguiente <ChevronRight className="ml-1 size-5" /></>}</Button>
            <Button aria-label="Añadir nota" className="size-14 rounded-xl" onClick={() => setShowNotes((value) => !value)} size="icon" variant="outline"><MoreHorizontal /></Button>
          </div>
          <p className="mt-3 text-center text-xs font-medium text-muted-foreground">Cada toque se guarda automáticamente · funciona sin conexión</p>
        </div>
      </article>

      <button className="quick-card" onClick={() => setShowCardio((value) => !value)} type="button"><span className="icon-tile"><Wind /></span><span className="flex-1 text-left"><strong className="block">Cardio o caminata</strong><small className="text-muted-foreground">{weekPlan.cardio}</small></span><Plus className={`transition ${showCardio ? 'rotate-45' : ''}`} /></button>
      {showCardio ? <CardioForm updateState={updateState} /> : null}
    </div>
  );
}

function WarmupCard({ state, updateState }: { state: AppState; updateState: (updater: (state: AppState) => AppState) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-border bg-card">
      <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen((value) => !value)} type="button"><span className="icon-tile"><RotateCcw /></span><span className="flex-1"><strong className="block">Calentamiento rápido</strong><small className="text-muted-foreground">{state.warmupDone.length}/{warmup.length} completado</small></span><ChevronRight className={`text-muted-foreground transition ${open ? 'rotate-90' : ''}`} /></button>
      {open ? <div className="space-y-1 border-t border-border p-3">{warmup.map((item) => <label key={item} className="flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-muted"><Checkbox checked={state.warmupDone.includes(item)} onCheckedChange={(checked) => updateState((current) => ({ ...current, warmupDone: checked ? [...current.warmupDone, item] : current.warmupDone.filter((done) => done !== item) }))} /><span className="text-sm font-medium">{item}</span></label>)}</div> : null}
    </section>
  );
}

function CardioForm({ updateState }: { updateState: (updater: (state: AppState) => AppState) => void }) {
  const [type, setType] = useState('Caminata'); const [minutes, setMinutes] = useState(30); const [steps, setSteps] = useState(4000); const [rpe, setRpe] = useState(4); const [distance, setDistance] = useState(3); const [saved, setSaved] = useState(false);
  const save = () => { const log: CardioLog = { id: uid(), date: new Date().toISOString(), type, minutes, distance, steps, rpe }; updateState((state) => ({ ...state, cardioLogs: [...state.cardioLogs, log] })); setSaved(true); };
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="control-label">Tipo</p><div className="mb-4 grid grid-cols-3 gap-2">{['Caminata', 'Bici', 'Elíptica'].map((item) => <button key={item} className={`h-10 rounded-lg border text-sm font-bold ${type === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`} onClick={() => setType(item)} type="button">{item}</button>)}</div>
      <div className="grid grid-cols-2 gap-3"><div><span className="control-label">Minutos</span><Stepper value={minutes} onChange={setMinutes} step={5} /></div><div><span className="control-label">Distancia km</span><Stepper value={distance} onChange={setDistance} step={0.5} /></div><div><span className="control-label">Pasos</span><Stepper value={steps} onChange={setSteps} step={500} /></div><Segmented label="RPE" value={rpe} values={[2, 4, 6, 8, 10]} onChange={setRpe} /></div>
      <Button className="mt-4 h-12 w-full rounded-xl font-bold" onClick={save}>{saved ? <><Check /> Guardado</> : <><Save /> Guardar actividad</>}</Button>
    </section>
  );
}

function PlanView({ state, updateState }: { state: AppState; updateState: (updater: (state: AppState) => AppState) => void }) {
  const blocks = Array.from(new Set(state.plan.map((week) => week.block)));
  return (
    <div><div className="section-heading"><div><p className="eyebrow">24 semanas</p><h1 className="page-title">Tu plan, paso a paso</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Dos días al principio. El tercero llega cuando ya hay base. Las descargas están programadas.</p></div></div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">{blocks.map((block) => <span key={block} className="whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold">{block}</span>)}</div>
      <div className="space-y-3">{state.plan.map((week) => <button key={week.week} className={`group grid w-full grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border p-3 text-left transition ${state.week === week.week ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/40'}`} onClick={() => updateState((current) => ({ ...current, week: week.week, warmupDone: [] }))} type="button"><span className={`grid size-12 place-items-center rounded-xl text-lg font-bold ${state.week === week.week ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{week.week}</span><span><span className="flex items-center gap-2"><strong>{week.block}</strong>{week.deload ? <span className="rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">DESCARGA</span> : null}</span><small className="mt-1 block text-muted-foreground">{week.sessions} sesiones · {week.routines.join(' + ')} · {week.cardio}</small></span><ChevronRight className="text-muted-foreground group-hover:text-primary" /></button>)}</div>
    </div>
  );
}

function SessionsView({ state, updateState }: { state: AppState; updateState: (updater: (state: AppState) => AppState) => void }) {
  const [building, setBuilding] = useState(false);

  const addSession = (session: Session) => {
    updateState((current) => {
      const inCurrentWeek = current.plan.map((week) => week.week === current.week ? { ...week, routines: week.routines.includes(session.id) ? week.routines : [...week.routines, session.id] } : week);
      return { ...current, sessions: [...current.sessions, session], plan: inCurrentWeek };
    });
    setBuilding(false);
  };

  const removeSession = (id: string) => updateState((current) => ({
    ...current,
    sessions: current.sessions.filter((session) => session.id !== id),
    plan: current.plan.map((week) => ({ ...week, routines: week.routines.filter((routine) => routine !== id) })),
  }));

  if (building) return <SessionBuilder onCancel={() => setBuilding(false)} onSave={addSession} />;

  return (
    <div><div className="section-heading"><div><p className="eyebrow">{state.sessions.length} sesiones</p><h1 className="page-title">Tus sesiones</h1><p className="mt-2 text-sm text-muted-foreground">Usa las del plan o crea las tuyas con el catálogo de ejercicios.</p></div></div>
      <Button className="mb-5 h-12 w-full rounded-xl font-bold" onClick={() => setBuilding(true)}><Plus /> Crear sesión</Button>
      <div className="space-y-3">{state.sessions.map((session) => { const custom = !SEED_SESSION_IDS.has(session.id); return (
        <div key={session.id} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <span className="grid size-12 place-items-center rounded-xl bg-muted text-primary"><Dumbbell className="size-5" /></span>
          <span className="min-w-0"><strong className="block truncate">{session.name}</strong><small className="text-muted-foreground">{session.exercises.length} ejercicios{custom ? '' : ' · plan base'}</small></span>
          {custom ? <button aria-label={`Eliminar ${session.name}`} className="grid size-11 place-items-center rounded-xl border border-border text-muted-foreground transition hover:text-red-600 active:scale-95" onClick={() => removeSession(session.id)} type="button"><Trash2 className="size-4.5" /></button> : <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">Base</span>}
        </div>
      ); })}</div>
    </div>
  );
}

function SessionBuilder({ onSave, onCancel }: { onSave: (session: Session) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Exercise[]>([]);
  const results = useMemo(() => searchCatalog(query), [query]);
  const pickedNames = useMemo(() => new Set(picked.map((item) => item.name)), [picked]);

  const add = (item: CatalogExercise) => setPicked((current) => current.some((exercise) => exercise.name === item.name) ? current : [...current, { name: item.name, target: `${item.bodyPart} · ${item.equipment}`, sets: 3, minReps: 8, maxReps: 12, increment: 2.5, unit: 'kg' }]);
  const remove = (exerciseName: string) => setPicked((current) => current.filter((exercise) => exercise.name !== exerciseName));
  const save = () => { const trimmed = name.trim(); if (!trimmed || picked.length === 0) return; onSave({ id: uid(), name: trimmed, exercises: picked }); };

  return (
    <div>
      <div className="mb-5 flex items-center gap-3"><Button aria-label="Cancelar" className="size-11 rounded-xl" onClick={onCancel} size="icon" variant="outline"><X /></Button><div><p className="eyebrow">Nueva sesión</p><h1 className="page-title">Crear sesión</h1></div></div>
      <input aria-label="Nombre de la sesión" className="mb-4 h-12 w-full rounded-xl border border-border bg-background px-4 text-base font-medium outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setName(event.target.value)} placeholder="Nombre (p. ej. Empuje A)" value={name} />

      {picked.length ? <div className="mb-4 space-y-2">{picked.map((exercise) => (
        <div key={exercise.name} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{exercise.name}</strong><small className="text-muted-foreground">3×8–12 · RIR 2–3</small></span><button aria-label={`Quitar ${exercise.name}`} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:text-red-600" onClick={() => remove(exercise.name)} type="button"><X className="size-4" /></button></div>
      ))}</div> : null}

      <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3"><Search className="size-4 text-muted-foreground" /><input aria-label="Buscar ejercicios" className="h-11 flex-1 bg-transparent text-sm outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ejercicio, músculo o material…" value={query} /></div>
      <div className="space-y-2">{results.map((item) => { const added = pickedNames.has(item.name); return (
        <button key={item.id} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${added ? 'border-emerald-500/50 bg-emerald-500/7' : 'border-border bg-card hover:border-primary/40'}`} onClick={() => add(item)} type="button">
          <img alt="" className="size-12 shrink-0 rounded-lg bg-muted object-cover" loading="lazy" src={exerciseImageUrl(item.image)} />
          <span className="min-w-0 flex-1"><strong className="block truncate text-sm capitalize">{item.name}</strong><small className="text-muted-foreground capitalize">{item.target} · {item.equipment}</small></span>
          {added ? <Check className="size-5 text-emerald-600" /> : <Plus className="size-5 text-muted-foreground" />}
        </button>
      ); })}</div>

      <div className="sticky bottom-24 mt-5"><Button className="h-14 w-full rounded-xl text-base font-bold shadow-sm" disabled={!name.trim() || picked.length === 0} onClick={save}><Save /> Guardar sesión ({picked.length})</Button></div>
    </div>
  );
}

function ProgressView({ state }: { state: AppState }) {
  const strengthSessions = new Set(state.exerciseLogs.map((log) => `${log.date.slice(0, 10)}-${log.routine}`)).size;
  const cardioMinutes = state.cardioLogs.reduce((sum, log) => sum + log.minutes, 0);
  const steps = state.cardioLogs.reduce((sum, log) => sum + log.steps, 0);
  const latestMeasure = state.measurements.at(-1);
  const painFree = state.exerciseLogs.length ? Math.round((state.exerciseLogs.filter((log) => log.pain < 2).length / state.exerciseLogs.length) * 100) : 100;
  const weeklyBars = [22, 38, 30, 58, 46, 72, Math.min(100, 15 + state.exerciseLogs.length * 8)];
  return (
    <div><div className="section-heading"><div><p className="eyebrow">Tendencias, no presión</p><h1 className="page-title">Tu progreso</h1><p className="mt-2 text-sm text-muted-foreground">Mira semanas y meses, no un solo día.</p></div></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric icon={Dumbbell} label="Fuerza" value={`${strengthSessions}`} detail="sesiones" /><Metric icon={Timer} label="Cardio" value={`${cardioMinutes}`} detail="minutos" /><Metric icon={Footprints} label="Actividad" value={steps ? `${Math.round(steps / 1000)}k` : '0'} detail="pasos" /><Metric icon={HeartPulse} label="Sin molestias" value={`${painFree}%`} detail="ejercicios" /></div>
      <section className="mt-4 rounded-2xl border border-border bg-card p-5"><div className="mb-6 flex items-center justify-between"><div><h2 className="font-bold">Actividad semanal</h2><p className="text-sm text-muted-foreground">Fuerza + cardio + caminatas</p></div><span className="rounded-lg bg-emerald-500/12 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">Constancia</span></div><div className="flex h-40 items-end gap-3">{weeklyBars.map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-md bg-primary/75" style={{ height: `${height}%` }} /><span className="text-[10px] font-semibold text-muted-foreground">S{Math.max(1, state.week - 6 + index)}</span></div>)}</div></section>
      <div className="mt-4 grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Indicadores de salud</h2><div className="mt-4 space-y-3"><ProgressRow label="Peso" value={latestMeasure?.weight ? `${latestMeasure.weight} kg` : 'Opcional'} percent={55} /><ProgressRow label="Cintura" value={latestMeasure?.waist ? `${latestMeasure.waist} cm` : 'Opcional'} percent={48} /><ProgressRow label="FC en reposo" value={latestMeasure?.restingHr ? `${latestMeasure.restingHr} ppm` : 'Opcional'} percent={64} /></div></section><section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Preparación física</h2><p className="mt-2 text-sm text-muted-foreground">La base combina fuerza general, movilidad y cardio antes de sumar deportes de combate.</p><div className="mt-5 flex items-center gap-4"><div className="progress-ring size-20 border-[7px] text-lg">{Math.round((state.week / 24) * 100)}%</div><div><strong>Bloque {state.week < 9 ? 'de reentrada' : state.week < 18 ? 'de fuerza base' : 'de capacidad'}</strong><p className="mt-1 text-xs text-muted-foreground">Semana {state.week} de 24</p></div></div></section></div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-border bg-card p-4"><span className="mb-4 grid size-9 place-items-center rounded-lg bg-muted text-primary"><Icon className="size-4" /></span><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value} <small className="text-xs font-medium text-muted-foreground">{detail}</small></p></div>; }
function ProgressRow({ label, value, percent }: { label: string; value: string; percent: number }) { return <div><div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{label}</span><strong>{value}</strong></div><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div></div>; }

function MobilityView({ state, updateState }: { state: AppState; updateState: (updater: (state: AppState) => AppState) => void }) {
  const [mode, setMode] = useState<'corta' | 'larga'>('corta'); const items = mode === 'corta' ? mobility.slice(0, 5) : mobility.slice(5);
  return (
    <div><div className="section-heading"><div><p className="eyebrow">5–10 minutos</p><h1 className="page-title">Mueve mejor</h1><p className="mt-2 text-sm text-muted-foreground">Poco, frecuente y sin forzar.</p></div></div>
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-muted p-1"><button className={`h-10 rounded-lg text-sm font-bold ${mode === 'corta' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`} onClick={() => setMode('corta')} type="button">Rutina corta</button><button className={`h-10 rounded-lg text-sm font-bold ${mode === 'larga' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`} onClick={() => setMode('larga')} type="button">Rutina larga</button></div>
      <div className="space-y-3">{items.map(([name, dose, area], index) => { const key = `${mode}-${name}`; const done = state.mobilityDone.includes(key); return <button key={name} className={`grid w-full grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border p-3.5 text-left transition ${done ? 'border-emerald-500/40 bg-emerald-500/7' : 'border-border bg-card'}`} onClick={() => updateState((current) => ({ ...current, mobilityDone: done ? current.mobilityDone.filter((item) => item !== key) : [...current.mobilityDone, key] }))} type="button"><span className={`grid size-12 place-items-center rounded-xl ${done ? 'bg-emerald-500 text-white' : 'bg-muted text-primary'}`}>{done ? <Check /> : <span className="text-sm font-bold">{index + 1}</span>}</span><span><strong className="block">{name}</strong><small className="text-muted-foreground">{dose} · {area}</small></span><ChevronRight className="text-muted-foreground" /></button>; })}</div>
      <div className="mt-5 flex gap-3 rounded-2xl border border-border bg-card p-4"><Info className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm text-muted-foreground"><strong className="text-foreground">Regla sencilla:</strong> busca una tensión cómoda, nunca dolor. Si algo supera 3/10, reduce el rango o para.</p></div>
    </div>
  );
}

function ProfileView({ state, updateState, user, authBusy, authError, onGoogleLogin, onLogout }: { state: AppState; updateState: (updater: (state: AppState) => AppState) => void; user: FirebaseUser | null; authBusy: boolean; authError: string; onGoogleLogin: () => void; onLogout: () => void }) {
  const [weight, setWeight] = useState(state.measurements.at(-1)?.weight ?? 80); const [waist, setWaist] = useState(state.measurements.at(-1)?.waist ?? 90); const [restingHr, setRestingHr] = useState(state.measurements.at(-1)?.restingHr ?? 65); const [sleep, setSleep] = useState(3); const [energy, setEnergy] = useState(3); const [pain, setPain] = useState(0); const [saved, setSaved] = useState(false);
  const save = () => { updateState((current) => ({ ...current, measurements: [...current.measurements, { id: uid(), date: new Date().toISOString(), weight, waist, restingHr, sleep, energy, pain }] })); setSaved(true); };
  return (
    <div><div className="section-heading"><div><p className="eyebrow">Todo es opcional</p><h1 className="page-title">Tu estado</h1><p className="mt-2 text-sm text-muted-foreground">Registra solo lo que te resulte útil.</p></div></div>
      <section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Chequeo rápido</h2><div className="mt-4 grid grid-cols-2 gap-3"><div><span className="control-label">Peso kg</span><Stepper value={weight} onChange={setWeight} step={0.5} /></div><div><span className="control-label">Cintura cm</span><Stepper value={waist} onChange={setWaist} /></div><div><span className="control-label">FC reposo</span><Stepper value={restingHr} onChange={setRestingHr} /></div><Segmented label="Sueño 1–5" value={sleep} values={[1,2,3,4,5]} onChange={setSleep} /><Segmented label="Energía 1–5" value={energy} values={[1,2,3,4,5]} onChange={setEnergy} /><Segmented label="Dolor general" value={pain} values={[0,1,2,3,4]} onChange={setPain} pain /></div><Button className="mt-5 h-12 w-full rounded-xl font-bold" onClick={save}>{saved ? <><Check /> Guardado</> : 'Guardar chequeo'}</Button></section>
      <section className="mt-4 rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Clases opcionales</h2><p className="mt-1 text-sm text-muted-foreground">Suma una si te deja mejor, no agotado.</p><div className="mt-3 divide-y divide-border">{['Pilates', 'Spinning', 'Body Pump', 'Total Training'].map((item) => <label key={item} className="flex min-h-13 items-center justify-between"><span className="text-sm font-medium">{item}</span><Switch checked={state.classes.includes(item)} onCheckedChange={(checked) => updateState((current) => ({ ...current, classes: checked ? [...current.classes, item] : current.classes.filter((value) => value !== item) }))} /></label>)}</div></section>
      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        {user ? <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">{(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><strong className="block truncate">{user.displayName || 'Cuenta de Google'}</strong><small className="block truncate text-muted-foreground">{user.email}</small></div><Button aria-label="Cerrar sesión" className="size-11 rounded-xl" disabled={authBusy} onClick={onLogout} size="icon" variant="outline"><LogOut /></Button></div> : <div><div className="mb-4 flex gap-3"><span className="icon-tile"><Cloud /></span><div><strong className="block">Guarda tu progreso</strong><small className="text-muted-foreground">Inicia sesión para sincronizar entre dispositivos.</small></div></div><Button className="h-12 w-full rounded-xl bg-white font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50" disabled={authBusy || !firebaseConfigured} onClick={onGoogleLogin}><span className="grid size-6 place-items-center rounded-full bg-white text-base font-black text-blue-600">G</span>{authBusy ? 'Conectando…' : 'Continuar con Google'}</Button>{authError ? <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-300">{authError}</p> : null}</div>}
      </section>
      <section className="mt-4 rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="icon-tile">{user ? <Cloud /> : <CloudOff />}</span><div><strong className="block">Sincronización</strong><small className="text-muted-foreground">{user ? 'Firebase conectado a tu cuenta' : firebaseConfigured ? 'Solo en este dispositivo hasta iniciar sesión' : 'Local; añade las variables de Firebase'}</small></div></div><span className={`size-2.5 rounded-full ${user ? 'bg-emerald-500' : 'bg-amber-400'}`} /></div></section>
    </div>
  );
}

export default function HomePage() {
  const [state, setState] = useState<AppState>(() => seedAccount(defaultState));
  const [tab, setTab] = useState<Tab>('today');
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const updateState = useCallback((updater: (state: AppState) => AppState) => setState((current) => updater(current)), []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    const initialize = async () => {
      try {
        const saved = await loadLocalState();
        if (!cancelled && saved) setState(seedAccount(saved));
      } finally {
        if (!cancelled) setHydrated(true);
      }
      unsubscribe = await subscribeToAuth(async (user) => {
        if (cancelled) return;
        setFirebaseUser(user);
        if (user) {
          const remote = await loadFromFirebase().catch(() => null);
          if (!cancelled && remote) setState(seedAccount(remote));
        }
      });
    };
    void initialize();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    return () => { cancelled = true; unsubscribe?.(); };
  }, []);
  useEffect(() => { if (!hydrated) return; const timer = window.setTimeout(async () => { setSyncing(true); await saveLocalState(state); if (firebaseUser) await syncToFirebase(state); setSyncing(false); }, 350); return () => window.clearTimeout(timer); }, [firebaseUser, hydrated, state]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({ name: 'log_walk', title: 'Registrar caminata', description: 'Registra una caminata con minutos y pasos en Base.', inputSchema: { type: 'object', properties: { minutes: { type: 'number', minimum: 1 }, steps: { type: 'number', minimum: 0 } }, required: ['minutes', 'steps'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: (input: unknown) => { const value = input as { minutes?: number; steps?: number }; if (!Number.isFinite(value.minutes) || !Number.isFinite(value.steps) || Number(value.minutes) < 1 || Number(value.steps) < 0) throw new Error('Minutos o pasos no válidos'); const log: CardioLog = { id: uid(), date: new Date().toISOString(), type: 'Caminata', minutes: Number(value.minutes), distance: 0, steps: Number(value.steps), rpe: 4 }; setState((current) => ({ ...current, cardioLogs: [...current.cardioLogs, log] })); return { status: 'saved', id: log.id }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const handleGoogleLogin = async () => { setAuthBusy(true); setAuthError(''); try { await signInWithGoogle(); } catch (error) { const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''; setAuthError(code.includes('popup-closed') ? 'Se cerró la ventana antes de completar el acceso.' : code.includes('unauthorized-domain') ? 'Añade este dominio a los dominios autorizados de Firebase.' : 'No se pudo iniciar sesión. Inténtalo de nuevo.'); } finally { setAuthBusy(false); } };
  const handleLogout = async () => { setAuthBusy(true); setAuthError(''); try { await signOutFirebase(); } catch { setAuthError('No se pudo cerrar la sesión.'); } finally { setAuthBusy(false); } };

  const content = tab === 'today' ? <TodayView state={state} updateState={updateState} /> : tab === 'plan' ? <PlanView state={state} updateState={updateState} /> : tab === 'sessions' ? <SessionsView state={state} updateState={updateState} /> : tab === 'progress' ? <ProgressView state={state} /> : tab === 'mobility' ? <MobilityView state={state} updateState={updateState} /> : <ProfileView authBusy={authBusy} authError={authError} onGoogleLogin={handleGoogleLogin} onLogout={handleLogout} state={state} updateState={updateState} user={firebaseUser} />;

  return (
    <div className={state.theme === 'dark' ? 'dark' : ''}>
      <main className="min-h-dvh bg-background text-foreground">
        <div className="mx-auto min-h-dvh max-w-[1180px] px-4 pb-28 pt-5 sm:px-7 lg:pb-28">
          <header className="mb-7 flex items-center justify-between">
            <button className="flex items-center gap-3 text-left" onClick={() => setTab('today')} type="button"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><HeartPulse className="size-5" strokeWidth={2.4} /></span><span><span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Base</span><span className="block text-sm font-semibold">Tu vuelta, a tu ritmo</span></span></button>
            <div className="flex items-center gap-2"><span aria-label={syncing ? 'Guardando' : 'Guardado'} className="hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:flex">{syncing ? <Activity className="size-4 animate-pulse" /> : firebaseUser ? <Cloud className="size-4" /> : <Save className="size-4" />}{syncing ? 'Guardando' : firebaseUser ? 'Sincronizado' : 'Guardado local'}</span><Button aria-label={state.theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'} className="size-11 rounded-xl border-border bg-card text-foreground shadow-sm hover:bg-muted" onClick={() => updateState((current) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))} size="icon" variant="outline">{state.theme === 'dark' ? <Sun /> : <Moon />}</Button></div>
          </header>
          <div className="mx-auto max-w-[760px]">{content}</div>
        </div>
        <nav aria-label="Navegación principal" className="bottom-nav"><div className="mx-auto grid max-w-[620px] grid-cols-6">{navItems.map(({ id, label, icon: Icon }) => <button key={id} aria-current={tab === id ? 'page' : undefined} className={`nav-button ${tab === id ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setTab(id)} type="button"><Icon className="size-5" strokeWidth={tab === id ? 2.7 : 2} />{label}</button>)}</div></nav>
      </main>
    </div>
  );
}
