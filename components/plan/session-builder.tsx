'use client';

import {
  ArrowDown,
  ArrowUp,
  Check,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { moveItem } from '@/lib/list-order';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  exerciseCatalogSections,
  getExerciseDisplayName,
  getExerciseDetails,
  type CatalogExercise,
} from '@/lib/exercise-catalog';
import { type Exercise } from '@/lib/workout-data';
import { type Session } from '@/lib/storage';
import { SectionedExerciseCatalog } from '@/components/sectioned-exercise-catalog';
import { CatalogFilters } from '@/components/catalog-filters';
import type { CatalogFilters as CatalogFilterValue } from '@/lib/catalog-filters';
import { ExercisePrescriptionEditor } from '@/components/exercise-prescription-editor';
import { type RestPreferences } from '@/lib/rest-preferences';
import { uid } from '@/lib/local-date';
import { CustomExerciseDialog } from '@/components/plan/custom-exercise';
import {
  ExerciseImage,
  ExercisePreview,
} from '@/components/exercises/exercise-media';

export function SessionBuilder({
  defaultRest,
  initialSession,
  onSave,
  onCancel,
  customExercises = [],
}: {
  defaultRest: RestPreferences;
  initialSession?: Session;
  onSave: (session: Session) => void;
  onCancel: () => void;
  customExercises?: Exercise[];
}) {
  const [name, setName] = useState(initialSession?.name ?? '');
  const [query, setQuery] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [custom, setCustom] = useState<Exercise | 'new' | null>(null);
  const [saveError, setSaveError] = useState('');
  const [filters, setFilters] = useState<CatalogFilterValue>({});
  const [picked, setPicked] = useState<Exercise[]>(
    initialSession?.exercises.map((exercise) => ({ ...exercise })) ?? [],
  );
  const searchQuery = useDeferredValue(query);
  const sections = useMemo(
    () => exerciseCatalogSections(searchQuery, filters),
    [searchQuery, filters],
  );
  const total = sections.reduce(
    (count, section) => count + section.items.length,
    0,
  );
  const pickedNames = useMemo(
    () => new Set(picked.map((item) => item.name)),
    [picked],
  );

  const add = (item: CatalogExercise) =>
    setPicked((current) =>
      current.some((exercise) => exercise.name === item.name)
        ? current
        : [
            ...current,
            {
              name: item.name,
              catalogId: item.id,
              target: `3×8–12 · RIR 2–3`,
              sets: 3,
              minReps: 8,
              maxReps: 12,
              minRir: 2,
              maxRir: 3,
              increment: 2.5,
              unit: 'kg',
            },
          ],
    );
  const remove = (exerciseName: string) =>
    setPicked((current) =>
      current.filter((exercise) => exercise.name !== exerciseName),
    );
  const save = () => {
    const trimmed = name.trim();
    if (!trimmed || picked.length === 0) return;
    if (new TextEncoder().encode(JSON.stringify(picked)).length > 700000) { setSaveError('Esta rutina contiene demasiadas fotos. Quita alguna foto o divide la rutina antes de guardar.'); return; }
    onSave({
      id: initialSession?.id ?? uid(),
      name: trimmed,
      exercises: picked,
    });
  };

  return (
    <div className="session-builder">
      <div className="session-builder-settings">
        <div className="mb-5 flex items-center gap-3">
          <Button
            aria-label="Cancelar"
            className="size-11 rounded-xl"
            onClick={onCancel}
            size="icon"
            variant="outline"
          >
            <X />
          </Button>
          <div>
            <p className="eyebrow">
              {initialSession ? 'Editar rutina' : 'Nueva rutina'}
            </p>
            <h1 className="page-title">
              {initialSession ? 'Editar sesión' : 'Crear sesión'}
            </h1>
          </div>
        </div>
        <input
          aria-label="Nombre de la sesión"
          className="mb-4 h-12 w-full rounded-xl border border-border bg-background px-4 text-base font-medium outline-none focus:ring-2 focus:ring-ring"
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre (p. ej. Empuje A)"
          value={name}
        />

        {picked.length ? (
          <div className="mb-4 space-y-3">
            {picked.map((exercise, index) => (
              <div
                key={exercise.name}
                className="space-y-2 border-b border-border py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <ExerciseImage
                      image={
                        exercise.image || getExerciseDetails(exercise.name, exercise.catalogId)
                          ?.image
                      }
                      name={getExerciseDisplayName(
                        exercise.name,
                        exercise.catalogId,
                      )}
                    />
                  </span>
                  <strong className="min-w-0 flex-1 text-base">
                    {getExerciseDisplayName(exercise.name, exercise.catalogId)}
                  </strong>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Opciones de ${getExerciseDisplayName(exercise.name, exercise.catalogId)}`}
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-11 rounded-full"
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                      {exercise.id?.startsWith('custom:') ? <DropdownMenuItem className="min-h-11" onClick={() => setCustom(exercise)}>Editar nombre y foto</DropdownMenuItem> : null}
                      <DropdownMenuItem
                        className="min-h-11"
                        disabled={index === 0}
                        onClick={() =>
                          setPicked((current) => moveItem(current, index, -1))
                        }
                      >
                        <ArrowUp /> Mover arriba
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="min-h-11"
                        disabled={index === picked.length - 1}
                        onClick={() =>
                          setPicked((current) => moveItem(current, index, 1))
                        }
                      >
                        <ArrowDown /> Mover abajo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="min-h-11"
                        variant="destructive"
                        onClick={() => remove(exercise.name)}
                      >
                        <Trash2 /> Quitar ejercicio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <ExercisePrescriptionEditor
                  canLinkNext={index < picked.length - 1}
                  defaultRest={defaultRest}
                  exercise={exercise}
                  onChange={(updated) =>
                    setPicked((current) =>
                      current.map((item) =>
                        item.name === exercise.name ? updated : item,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
        ) : null}

        {!picked.length ? (
          <p className="mb-4 text-sm text-muted-foreground">
            Añade los ejercicios de tu rutina y ajusta sus objetivos y
            descansos.
          </p>
        ) : null}
        <Button
          className="mb-4 min-h-12 w-full rounded-xl"
          variant="outline"
          onClick={() => setCatalogOpen(true)}
        >
          <Plus className="size-4" /> Añadir ejercicios
        </Button>
        <Button variant="ghost" className="mb-4 min-h-11 w-full" onClick={() => setCustom('new')}>Crear ejercicio propio</Button>
        {customExercises.length ? <details className="mb-4"><summary className="min-h-11 cursor-pointer py-3 text-sm">Tus ejercicios propios</summary>{customExercises.filter(item => !picked.some(selected => selected.id === item.id || selected.name === item.name)).map(item => <Button key={item.id} variant="ghost" className="min-h-11 w-full justify-start" onClick={() => setPicked(current => [...current, { ...item }])}><Plus />{item.name}</Button>)}</details> : null}
        {saveError ? <p role="alert" className="text-sm text-destructive">{saveError}</p> : null}
      </div>
      {custom ? <CustomExerciseDialog existing={custom === 'new' ? undefined : custom} names={picked.map(item => item.name)} onClose={() => setCustom(null)} onSave={exercise => { setPicked(current => custom === 'new' ? [...current, exercise] : current.map(item => item.id === exercise.id ? exercise : item)); setCustom(null); }} /> : null}
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="catalog-sheet">
          <div className="shrink-0 pr-8">
            <DialogTitle>Añadir ejercicios</DialogTitle>
            <DialogDescription className="mt-2">
              Elige del catálogo; después ajusta cada ejercicio en tu rutina.
            </DialogDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                aria-label="Buscar ejercicios"
                className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar ejercicio…"
                value={query}
              />
            </div>
            <CatalogFilters value={filters} onChange={setFilters} />
          </div>
          <p
            className="mb-2 text-xs text-muted-foreground"
            aria-busy={query !== searchQuery}
            aria-live="polite"
          >
            {query !== searchQuery ? 'Buscando… ' : ''}
            {total} {total === 1 ? 'ejercicio' : 'ejercicios'}
            {searchQuery ? ` para “${searchQuery}”` : ''}
          </p>
          {!total ? (
            <p className="p-4 text-sm text-muted-foreground">
              No hay ejercicios con esta búsqueda y estos filtros. Prueba otra
              combinación.
            </p>
          ) : null}
          <SectionedExerciseCatalog
            key={`${searchQuery}:${filters.bodyPart ?? ''}:${filters.equipment ?? ''}`}
            sections={sections}
            renderExercise={(item) => {
              const added = pickedNames.has(item.name);
              const translated = getExerciseDisplayName(item.name, item.id);
              return (
                <div
                  key={item.id}
                  className={`catalog-exercise-row flex w-full items-center gap-3 p-3 text-left transition ${added ? 'bg-primary/8' : ''}`}
                >
                  <ExercisePreview
                    image={item.image}
                    name={translated}
                    description={item.description}
                    compact
                  />
                  <button
                    aria-label={`${added ? 'Añadido' : 'Añadir'}: ${translated}`}
                    aria-disabled={added}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-primary"
                    onClick={() => add(item)}
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm">{translated}</strong>
                      {translated !== item.name ? (
                        <small className="block truncate text-xs text-muted-foreground">
                          {item.name}
                        </small>
                      ) : null}
                    </span>
                    {added ? (
                      <Check className="size-5 shrink-0 text-emerald-600" />
                    ) : (
                      <Plus className="size-5 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </div>
              );
            }}
          />
          <Button
            className="min-h-12 shrink-0 rounded-xl"
            onClick={() => setCatalogOpen(false)}
          >
            Listo · {picked.length}{' '}
            {picked.length === 1 ? 'ejercicio' : 'ejercicios'}
          </Button>
        </DialogContent>
      </Dialog>
      <div className="session-builder-actions">
        <Button
          className="h-14 w-full rounded-xl text-base font-bold shadow-sm"
          disabled={!name.trim() || picked.length === 0}
          onClick={save}
        >
          <Save />{' '}
          {initialSession
            ? 'Guardar cambios'
            : `Crear rutina (${picked.length})`}
        </Button>
      </div>
    </div>
  );
}
