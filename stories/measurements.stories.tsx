import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MeasurementTracker } from '@/components/measurement-tracker';
import { defaultState, type AppState } from '@/lib/storage';

const meta = { title: 'Progreso/Medidas', parameters: { docs: { description: { component: 'Medidas de demostración en memoria para revisar las escalas, periodos y temas. No modifica ninguna cuenta.' } } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function Example({ empty = false }: { empty?: boolean }) {
  const [state, setState] = useState<AppState>(() => ({ ...defaultState, measurements: empty ? [] : Array.from({ length: 18 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (17 - index) * 5);
    return { id: `demo-${index}`, date: date.toISOString(), weight: 84 - index * .2 + (index % 3) * .15, waist: 96 - index * .25 };
  }) }));
  return <div className="mx-auto max-w-[760px]"><p className="mb-4 text-xs text-muted-foreground">Demostración · datos en memoria</p><MeasurementTracker state={state} updateState={setState} /></div>;
}
export const Evolucion: Story = { render: () => <Example /> };
export const SinMedidas: Story = { render: () => <Example empty /> };
