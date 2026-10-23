import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExercisePrescriptionEditor } from '@/components/exercise-prescription-editor';
import type { Exercise } from '@/lib/workout-data';
const meta = { title: 'Entrenamiento/Objetivos por ejercicio' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function Example({ distance = false }: { distance?: boolean }) {
  const [exercise, setExercise] = useState<Exercise>({ name: distance ? 'Farmer carry' : 'Remo sentado', sets: 3, minReps: distance ? 20 : 8, maxReps: distance ? 40 : 12, target: distance ? '3×20–40 m · RIR 2–3' : '3×8–12 · RIR 2–3', increment: 2.5, unit: distance ? 'kg/m' : 'kg' });
  return <div className="mx-auto max-w-lg space-y-4 rounded-3xl border border-border bg-card p-5"><h1 className="text-xl font-bold">{exercise.name}</h1><ExercisePrescriptionEditor defaultRest={{ restSeconds: 90 }} exercise={exercise} onChange={setExercise} /><output aria-label="Objetivo guardado en la demo" className="block rounded-xl bg-primary/5 p-3 text-sm font-semibold text-primary">{exercise.target}</output><p className="text-xs text-muted-foreground">Vista de prueba · el objetivo se aplica al guardar los cambios de la sesión.</p></div>;
}
export const Repeticiones: Story = { render: () => <Example /> };
export const Distancia: Story = { render: () => <Example distance /> };
