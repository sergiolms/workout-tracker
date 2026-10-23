import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActivityCalendar } from '@/components/activity-calendar';

const daysAgo = (days: number) => { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString(); };
const meta = { title: 'Progreso/Calendario de actividad', component: ActivityCalendar, parameters: { docs: { description: { component: 'Datos de demostración. El calendario real usa los entrenamientos y actividades guardados.' } } } } satisfies Meta<typeof ActivityCalendar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConActividad: Story = { args: { workouts: [0, 2, 9, 18, 70, 140].map((days, index) => ({ id: `workout-${index}`, date: daysAgo(days), routine: 'demo', routineName: 'Rutina de demostración', week: 1, exercises: [{ name: 'Remo sentado', status: 'done' }], notes: '' })), activities: [1, 2, 10].map((days, index) => ({ id: `activity-${index}`, date: daysAgo(days), type: 'Caminata de demostración', minutes: 30, distance: 2 })) } };
export const SinActividad: Story = { args: { workouts: [], activities: [] } };
