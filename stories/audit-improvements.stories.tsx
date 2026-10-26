import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { defaultState, weeksFromPeriods, type AppState } from '@/lib/storage';
import { ProgressView } from '@/components/views/progress-view';
import { TodayView } from '@/components/views/today-view';
import { PlanView } from '@/components/views/plan-view';
import { ExerciseSetEditor } from '@/components/exercise-set-editor';
import { SessionBuilder } from '@/components/plan/session-builder';
import { LiquidNavigation } from '@/components/liquid-navigation';
import { navItems } from '@/components/navigation-items';
import { appendCatalogExercises } from '@/lib/session-exercises';
import { localDateKey } from '@/lib/local-date';
import { ExercisePrescriptionEditor } from '@/components/exercise-prescription-editor';
import { ExerciseHistoryPicker } from '@/components/exercises/exercise-history-picker';
import { exerciseCatalog } from '@/lib/exercise-catalog';
import {
  historyExerciseKey,
  type HistoryExercise,
} from '@/lib/exercise-history';
import type { Exercise } from '@/lib/workout-data';
import type { SetLog } from '@/lib/storage';

const meta = { title: 'Revisión/Mejoras de entrenamiento' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const exercise = {
  catalogId: '0603',
  name: 'Press hombros máquina',
  target: '3×8–12 · RIR 2',
  sets: 3,
  minReps: 8,
  maxReps: 12,
  increment: 0.5,
  unit: 'kg',
};
function fixture(): AppState {
  const periods = [
    {
      id: 'p',
      name: 'Fuerza',
      durationWeeks: 4,
      routines: ['r'],
      cardio: '',
      walks: '',
      mobility: '',
      optionalClass: '',
    },
  ];
  const logs = Array.from({ length: 8 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (8 - index) * 4);
    return {
      id: `log-${index}`,
      date: date.toISOString(),
      week: 1,
      routine: 'r',
      workoutId: `workout-${index}`,
      exercise: exercise.name,
      exerciseId: 'catalog:0603',
      unit: 'kg',
      load: 20 + index * 0.5,
      sets: [
        { reps: 12, load: 20 + index * 0.5, done: true },
        { reps: 10, load: 20 + index * 0.5, done: true },
      ],
      rir: 2,
      pain: 0,
      note: '',
      suggestion: 'mantener' as const,
    };
  });
  return {
    ...defaultState,
    mobilityDone: [
      `${localDateKey()}:corta-Open book`,
      `${localDateKey()}:corta-Wall slides`,
    ],
    periods,
    plan: weeksFromPeriods(periods),
    sessions: [{ id: 'r', name: 'Demostración', exercises: [exercise] }],
    exerciseLogs: logs,
    workoutLogs: logs.map((log) => ({
      id: log.workoutId,
      date: log.date,
      week: 1,
      routine: 'r',
      routineName: 'Demostración',
      exercises: [
        { name: log.exercise, logId: log.id, status: 'done' as const },
      ],
      notes: '',
    })),
    measurements: [
      { id: 'measure', date: new Date().toISOString(), weight: 72 },
    ],
  };
}
function Example({
  today = false,
  plan = false,
}: {
  today?: boolean;
  plan?: boolean;
}) {
  const [state, setState] = useState(fixture);
  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 text-sm text-muted-foreground">
        Demostración · datos en memoria · sin conexión con tu cuenta
      </p>
      {plan ? (
        <PlanView
          state={state}
          updateState={setState}
          onStartSession={() => {}}
        />
      ) : today ? (
        <TodayView
          accountId="storybook"
          editable
          state={state}
          updateState={setState}
          onOpenSessions={() => {}}
          preferredRoutine="r"
          onFinish={() => {}}
          notice=""
          onStartRest={() => {}}
          onStopRest={() => {}}
          onOfferUndo={() => {}}
          onClearUndo={() => {}}
        />
      ) : (
        <ProgressView state={state} editable updateState={setState} />
      )}
    </div>
  );
}
export const Progreso: Story = { render: () => <Example /> };
export const Entrenamiento: Story = { render: () => <Example today /> };
export const Plan: Story = { render: () => <Example plan /> };
const historyChoices: HistoryExercise[] = exerciseCatalog
  .slice(0, 125)
  .map((entry) => ({
    id: `catalog:${entry.id}`,
    catalogId: entry.id,
    name: entry.name,
    unit: 'kg',
    mode: 'reps',
    loadKind: 'total',
  }));
export const BuscadorConMuchosEjercicios: Story = {
  render: function HistoryPickerExample() {
    const [selected, setSelected] = useState(historyChoices[0]);
    return (
      <div className="mx-auto max-w-lg">
        <p className="mb-4 text-sm text-muted-foreground">
          Demostración con 125 ejercicios · datos en memoria
        </p>
        <ExerciseHistoryPicker
          state={defaultState}
          exercises={historyChoices}
          selected={selected}
          onSelect={(key) => {
            const choice = historyChoices.find(
              (entry) => historyExerciseKey(entry) === key,
            );
            if (choice) setSelected(choice);
          }}
        />
      </div>
    );
  },
};
export const SeriesPorTiempo: Story = {
  render: function Timed() {
    const [exercise, setExercise] = useState<Exercise>({
      ...exerciseFixture(),
      mode: 'time',
      unit: 'reps',
      loadKind: 'none',
      targetSeconds: 30,
      target: '3×30 s',
      name: 'Plancha',
    });
    const [sets, setSets] = useState<SetLog[]>([
      { reps: 0, seconds: 30, done: false },
      { reps: 0, seconds: 30, done: false },
    ]);
    return (
      <div className="mx-auto max-w-lg">
        <p className="mb-4">Demostración · datos en memoria</p>
        <ExercisePrescriptionEditor
          exercise={exercise}
          onChange={setExercise}
          defaultRest={{ restEnabled: true, restSeconds: 60 }}
        />
        <ExerciseSetEditor
          name="Plancha"
          mode={exercise.mode}
          unit={exercise.unit}
          loadKind={exercise.loadKind}
          load={0}
          sets={sets}
          onChange={setSets}
        />
      </div>
    );
  },
};
export const SeriesConBarra: Story = {
  render: function BarbellSets() {
    const [sets, setSets] = useState<SetLog[]>([
      { reps: 10, load: 40, done: true },
      { reps: 8, load: 65, done: false },
    ]);
    return (
      <div className="mx-auto max-w-lg">
        <p className="mb-4 text-sm text-muted-foreground">
          Demostración · datos en memoria
        </p>
        <ExerciseSetEditor
          name="Press de banca con barra"
          barbell
          unit="kg"
          loadKind="total"
          load={65}
          sets={sets}
          onChange={setSets}
        />
      </div>
    );
  },
};
export const EditorConMuchosEjercicios: Story = {
  render: function LongSession() {
    const [editing, setEditing] = useState(true);
    const [session, setSession] = useState({
      id: 'demo-scroll',
      name: 'Rutina de ejemplo',
      exercises: appendCatalogExercises([], exerciseCatalog.slice(0, 12)),
    });
    return (
      <div
        className="app-shell bg-background text-foreground"
        style={{ height: 'calc(100dvh - 40px)' }}
      >
        <main className="app-content">
          <div className="mx-auto max-w-[1180px] px-4 pb-6 pt-5">
            <header className="app-header">
              Demostración · datos en memoria
            </header>
            <div id="view-content">
              <div data-motion-region className="mx-auto max-w-[760px]">
                <fieldset className="min-w-0">
                  {editing ? (
                    <SessionBuilder
                      initialSession={session}
                      defaultRest={{ restEnabled: true, restSeconds: 60 }}
                      onCancel={() => setEditing(false)}
                      onSave={(next) => {
                        setSession(next);
                        setEditing(false);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="min-h-12 underline"
                      onClick={() => setEditing(true)}
                    >
                      Editar {session.name}
                    </button>
                  )}
                </fieldset>
              </div>
            </div>
          </div>
        </main>
        <div className="bottom-nav">
          <LiquidNavigation
            items={navItems}
            active="plan"
            onSelect={() => setEditing(false)}
          />
        </div>
      </div>
    );
  },
};
function exerciseFixture() {
  return exercise;
}
