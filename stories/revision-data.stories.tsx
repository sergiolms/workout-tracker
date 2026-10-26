import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlanView } from '@/components/views/plan-view';
import { SessionBuilder } from '@/components/plan/session-builder';
import { ExercisePickerSheet } from '@/components/training-dialogs';
import {
  BackupImportDialog,
  BackupImporter,
} from '@/components/backup-importer';
import { Button } from '@/components/ui/button';
import { defaultState, weeksFromPeriods, type AppState } from '@/lib/storage';
import { parseHevyCsv } from '@/lib/hevy-import';
import { getExerciseDetails } from '@/lib/exercise-catalog';
import { ViewBoundary } from '@/components/view-boundary';

const meta = {
  title: 'Revisión/Arquitectura y datos',
  parameters: {
    docs: {
      description: {
        component:
          'Datos de demostración en memoria. No conecta con Firebase ni cambia tu cuenta.',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const fixture: AppState = {
  ...defaultState,
  planName: 'Plan de demostración',
  periods: [
    {
      id: 'demo-period',
      name: 'Reentrada',
      durationWeeks: 3,
      routines: ['demo-routine'],
      cardio: '10 min · esfuerzo suave',
      walks: '20–30 min',
      mobility: '5 min',
      optionalClass: '',
    },
  ],
  sessions: [
    {
      id: 'demo-routine',
      name: 'Sesión de demostración',
      exercises: [
        {
          name: 'Press hombros máquina',
          catalogId: '0603',
          target: '3×8–12 · RIR 2–3',
          sets: 3,
          minReps: 8,
          maxReps: 12,
          increment: 0.5,
          unit: 'kg',
        },
        {
          name: 'Goblet squat',
          catalogId: '1760',
          target: '3×8–12',
          sets: 3,
          minReps: 8,
          maxReps: 12,
          increment: 0.5,
          unit: 'kg',
        },
      ],
    },
  ],
};
fixture.plan = weeksFromPeriods(fixture.periods);
function PlanExample() {
  const [state, setState] = useState(fixture);
  const [message, setMessage] = useState('');
  return (
    <>
      <p className="mb-4 text-xs text-muted-foreground">
        Demostración · datos en memoria
      </p>
      <PlanView
        state={state}
        updateState={setState}
        onStartSession={() =>
          setMessage('Sesión seleccionada en la demostración')
        }
      />
      {message ? <output>{message}</output> : null}
    </>
  );
}
function RoutineExample() {
  const [message, setMessage] = useState('');
  return (
    <>
      <p className="mb-4 text-xs text-muted-foreground">
        Demostración · no se guarda en tu cuenta
      </p>
      <SessionBuilder
        defaultRest={{ restEnabled: true, restSeconds: 60 }}
        onSave={(session) =>
          setMessage(`Guardada en la demostración: ${session.name}`)
        }
        onCancel={() => setMessage('Edición cancelada')}
      />
      {message ? <output>{message}</output> : null}
    </>
  );
}
function PickerExample() {
  const [open, setOpen] = useState(false),
    [current, setCurrent] = useState(0);
  return (
    <ExercisePickerSheet
      open={open}
      onOpenChange={setOpen}
      current={current}
      onSelect={setCurrent}
      items={[
        { name: 'Press de hombros', image: getExerciseDetails('', '0603')?.image, status: 'pending' },
        { name: 'Sentadilla goblet', image: getExerciseDetails('', '1760')?.image, status: 'done' },
      ]}
    />
  );
}
function HevyExample() {
  const [state, setState] = useState(defaultState);
  const [incoming, setIncoming] = useState<AppState | null>(null);
  return (
    <>
      <p className="mb-4 text-xs text-muted-foreground">
        Demostración · importación en memoria
      </p>
      <Button
        onClick={async () => {
          const result = await parseHevyCsv(
            'title,start_time,exercise_title,set_index,set_type,weight_kg,reps\nDemo,2026-10-25 09:00,Shoulder Press (Machine),0,normal,20,12',
          );
          setIncoming(result.state);
        }}
      >
        Revisar CSV de ejemplo
      </Button>
      <BackupImporter
        format="hevy"
        state={state}
        editable
        onImport={setState}
      />
      <output className="mt-4 block">
        {state.workoutLogs.length} entrenamientos en la demostración
      </output>
      {incoming ? (
        <BackupImportDialog
          state={state}
          incoming={incoming}
          editable
          onClose={() => setIncoming(null)}
          onImport={setState}
        />
      ) : null}
    </>
  );
}
export const Plan: Story = { render: () => <PlanExample /> };
export const Rutina: Story = { render: () => <RoutineExample /> };
export const Selector: Story = { render: () => <PickerExample /> };
export const ImportacionHevy: Story = { render: () => <HevyExample /> };

function BrokenDemo(): never { throw new Error('Fallo provocado en la demostración'); }
function RecoveryExample() {
  const [broken, setBroken] = useState(false);
  return <><p className="mb-3 text-xs text-muted-foreground">Demostración · fallo de vista en memoria</p><Button className="mb-4" onClick={() => setBroken(true)}>Simular fallo de vista</Button><ViewBoundary>{broken ? <BrokenDemo /> : <p>Vista disponible</p>}</ViewBoundary></>;
}
export const Recuperacion: Story = { render: () => <RecoveryExample /> };
