import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActivityHistoryEntry, HistoryBrowser, WorkoutHistoryEntry } from '@/components/training-history';
import type { CardioLog, WorkoutLog } from '@/lib/storage';

const meta = { title: 'Progreso/Historiales extensos', parameters: { docs: { description: { component: 'Registros de demostración para comprobar búsquedas, meses y paginación sin escribir en ninguna cuenta.' } } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const dates = Array.from({ length: 240 }, (_, index) => new Date(2026, 9, 23 - index * 3, 12).toISOString());
const workouts: WorkoutLog[] = dates.map((date, index) => ({ id: `demo-${index}`, date, routine: 'demo', routineName: index % 2 ? 'Tren superior (demo)' : 'Piernas (demo)', week: index + 1, exercises: [{ name: 'Ejercicio de demostración', status: 'done' }], notes: '' }));
const activities: CardioLog[] = dates.map((date, index) => ({ id: `demo-${index}`, date, type: index % 2 ? 'Caminata (demo)' : 'Bicicleta (demo)', minutes: 30, distance: 2 }));
export const Entrenamientos: Story = { render: () => <HistoryBrowser title="Historial de entrenamientos" entries={workouts} searchText={entry => entry.routineName} renderEntry={workout => <WorkoutHistoryEntry workout={workout} />} /> };
export const Actividades: Story = { render: () => <HistoryBrowser title="Actividad registrada" entries={activities} searchText={entry => entry.type} renderEntry={activity => <ActivityHistoryEntry activity={activity} />} /> };
