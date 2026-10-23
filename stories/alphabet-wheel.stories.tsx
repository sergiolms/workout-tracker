import type { Meta, StoryObj } from '@storybook/react-vite';
import { SectionedExerciseCatalog } from '@/components/sectioned-exercise-catalog';
import { exerciseCatalogSections, getExerciseDisplayName } from '@/lib/exercise-catalog';

const meta = { title: 'Entrenamiento/Índice de ejercicios' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const sections = exerciseCatalogSections();
function Example() {
  return <div className="mx-auto flex h-[70dvh] max-w-lg flex-col rounded-3xl border border-border bg-card p-4">
    <h1 className="text-lg font-bold">Catálogo de ejercicios</h1>
    <p className="mb-5 text-sm text-muted-foreground">{sections.reduce((total, section) => total + section.items.length, 0)} ejercicios · recorre las secciones sin filtrar.</p>
    <SectionedExerciseCatalog sections={sections} renderExercise={exercise => <div className="catalog-exercise-row p-3 text-sm">{getExerciseDisplayName(exercise.name, exercise.id)}</div>} />
  </div>;
}
export const Rueda: Story = { render: () => <Example /> };
