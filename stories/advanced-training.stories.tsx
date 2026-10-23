import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExerciseSetEditor } from '@/components/exercise-set-editor';
import { SyncConflicts } from '@/components/sync-conflicts';
import {
  BackupImporter,
  BackupImportDialog,
} from '@/components/backup-importer';
import { Button } from '@/components/ui/button';
import { RestCountdown } from '@/components/workout-feedback';
import { supersetTransition } from '@/lib/exercise-sets';
import { defaultState, type ExerciseLog, type SetLog } from '@/lib/storage';
import type { Exercise } from '@/lib/workout-data';

const meta = { title: 'Entrenamiento/Registro y recuperación' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const notice = (
  <p className="mb-5 text-xs text-muted-foreground">
    Demostración · datos en memoria · no escribe en Firebase
  </p>
);
export const SeriesYCargas: Story = {
  render: function Series() {
    const [sets, setSets] = useState<SetLog[]>([
      { reps: 8, load: 10, done: false, kind: 'warmup' },
      { reps: 12, load: 20, done: false },
      { reps: 10, load: 22.5, done: false },
      { reps: 8, load: 25, done: false },
    ]);
    return (
      <div className="mx-auto max-w-xl">
        {notice}
        <h1 className="mb-5 text-2xl font-bold">Remo · carga por serie</h1>
        <ExerciseSetEditor sets={sets} load={20} onChange={setSets} />
      </div>
    );
  },
};

export const Superserie: Story = {
  render: function Group() {
    const exercises: Exercise[] = [
      {
        name: 'Remo',
        target: '2×10',
        sets: 2,
        minReps: 10,
        maxReps: 10,
        increment: 0.5,
        supersetWithNext: true,
      },
      {
        name: 'Press',
        target: '2×10',
        sets: 2,
        minReps: 10,
        maxReps: 10,
        increment: 0.5,
      },
    ];
    const [current, setCurrent] = useState(0);
    const [logs, setLogs] = useState<ExerciseLog[]>(
      exercises.map((exercise, index) => ({
        id: String(index),
        date: '2026-10-23',
        week: 1,
        routine: 'demo',
        exercise: exercise.name,
        load: 20,
        sets: [
          { reps: 10, load: 20, done: false },
          { reps: 10, load: 20, done: false },
        ],
        rir: 2,
        pain: 0,
        note: '',
        suggestion: 'mantener',
      })),
    );
    const [deadline, setDeadline] = useState<number | null>(null);
    const set = (sets: SetLog[]) =>
      setLogs((logs) =>
        logs.map((log, index) => (index === current ? { ...log, sets } : log)),
      );
    return (
      <div className="mx-auto max-w-xl">
        {notice}
        <h1 className="text-2xl font-bold">
          Superserie · {exercises[current].name}
        </h1>
        <p className="mt-2 mb-5 text-sm text-muted-foreground">
          Al marcar una serie, pasa al otro ejercicio. El descanso aparece al
          completar la ronda.
        </p>
        <ExerciseSetEditor
          sets={logs[current].sets}
          load={20}
          onChange={set}
          onComplete={(sets, index) => {
            set(sets);
            if (!sets[index].done || sets[index].kind === 'warmup') return;
            const step = supersetTransition(exercises, current, sets, logs);
            if (step.rest) setDeadline(Date.now() + 60000);
            setCurrent(step.next);
          }}
        />
        {deadline ? (
          <RestCountdown
            deadline={deadline}
            onDismiss={() => setDeadline(null)}
          />
        ) : null}
      </div>
    );
  },
};

export const ElegirVersion: Story = {
  render: function Conflicts() {
    const [resolved, setResolved] = useState(false);
    return (
      <div className="mx-auto max-w-xl">
        {notice}
        {resolved ? (
          <output>Selección guardada en la demostración.</output>
        ) : (
          <SyncConflicts
            conflicts={[
              {
                path: 'setting:planName',
                local: 'Fuerza · otoño',
                remote: 'Fuerza · octubre',
              },
              {
                path: 'exerciseLogs:remo/sets/0/load',
                local: 22.5,
                remote: 25,
              },
            ]}
            onResolve={async () => setResolved(true)}
          />
        )}
      </div>
    );
  },
};

export const ImportarCopia: Story = {
  render: function Import() {
    const [state, setState] = useState(defaultState);
    const [preview, setPreview] = useState(false);
    return (
      <div className="mx-auto max-w-xl">
        {notice}
        <h1 className="mb-5 text-2xl font-bold">Importar copia</h1>
        <BackupImporter state={state} editable onImport={setState} />
        <Button
          className="mt-3 min-h-12"
          variant="outline"
          onClick={() => setPreview(true)}
        >
          Usar copia de demostración
        </Button>
        {preview ? (
          <BackupImportDialog
            editable
            state={state}
            incoming={{
              ...defaultState,
              cardioLogs: [
                {
                  id: 'demo-walk',
                  date: '2026-10-23T12:00:00Z',
                  type: 'Caminata de demostración',
                  minutes: 30,
                  distance: 2,
                },
              ],
            }}
            onImport={setState}
            onClose={() => setPreview(false)}
          />
        ) : null}
        <p className="mt-5 text-sm">
          {state.cardioLogs.length} actividades · {state.workoutLogs.length}{' '}
          entrenamientos · {state.measurements.length} medidas
        </p>
      </div>
    );
  },
};
