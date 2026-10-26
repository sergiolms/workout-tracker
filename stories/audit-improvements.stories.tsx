import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { defaultState, weeksFromPeriods, type AppState } from '@/lib/storage';
import { ProgressView } from '@/components/views/progress-view';
import { TodayView } from '@/components/views/today-view';

const meta = { title: 'Revisión/Mejoras de entrenamiento' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const exercise = { catalogId: '0603', name: 'Press hombros máquina', target: '3×8–12 · RIR 2', sets: 3, minReps: 8, maxReps: 12, increment: 0.5, unit: 'kg' };
function fixture(): AppState {
  const periods = [{ id: 'p', name: 'Fuerza', durationWeeks: 4, routines: ['r'], cardio: '', walks: '', mobility: '', optionalClass: '' }];
  const logs = Array.from({ length: 8 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (8 - index) * 4); return { id: `log-${index}`, date: date.toISOString(), week: 1, routine: 'r', workoutId: `workout-${index}`, exercise: exercise.name, exerciseId: 'catalog:0603', unit: 'kg', load: 20 + index * .5, sets: [{ reps: 12, load: 20 + index * .5, done: true }, { reps: 10, load: 20 + index * .5, done: true }], rir: 2, pain: 0, note: '', suggestion: 'mantener' as const }; });
  return { ...defaultState, periods, plan: weeksFromPeriods(periods), sessions: [{ id: 'r', name: 'Demostración', exercises: [exercise] }], exerciseLogs: logs, workoutLogs: logs.map(log => ({ id: log.workoutId, date: log.date, week: 1, routine: 'r', routineName: 'Demostración', exercises: [{ name: log.exercise, logId: log.id, status: 'done' as const }], notes: '' })), measurements: [{ id: 'measure', date: new Date().toISOString(), weight: 72 }] };
}
function Example({ today = false }: { today?: boolean }) {
  const [state, setState] = useState(fixture);
  return <div className="mx-auto max-w-3xl"><p className="mb-4 text-sm text-muted-foreground">Demostración · datos en memoria · sin conexión con tu cuenta</p>{today ? <TodayView accountId="storybook" editable state={state} updateState={setState} onOpenSessions={() => {}} preferredRoutine="r" onFinish={() => {}} notice="" onStartRest={() => {}} onStopRest={() => {}} onOfferUndo={() => {}} onClearUndo={() => {}} /> : <ProgressView state={state} editable updateState={setState} />}</div>;
}
export const Progreso: Story = { render: () => <Example /> };
export const Entrenamiento: Story = { render: () => <Example today /> };
