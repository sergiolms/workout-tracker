'use client';
import { usePlanEditor } from '@/hooks/use-plan-editor';
import { PlanPeriodEditor } from '@/components/plan/period-editor';
import { PlanWeek } from '@/components/plan/plan-week';
import { PlanRoutineLibrary } from '@/components/plan/routine-library';
import { PlanStructure } from '@/components/plan/plan-structure';
import { CalendarDays, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ViewTabs } from '@/components/view-tabs';
import { SessionBuilder } from '@/components/plan/session-builder';
import { PlanSharing } from '@/components/plan/plan-sharing';
import { RotationSettings } from '@/components/plan/rotation-settings';
export function PlanView(props: Parameters<typeof usePlanEditor>[0]) {
  const editor = usePlanEditor(props);
  const {
    state,
    updateState,
    openPeriodEditor,
    saveSession,
    removeSession,
    view,
    setView,
    planNameDraft,
    setPlanNameDraft,
    editing,
    setEditing,
    building,
    setBuilding,
    deletingSession,
    setDeletingSession,
  } = editor;
  if (building)
    return (
      <SessionBuilder
        customExercises={[
          ...new Map(
            state.sessions
              .flatMap((session) => session.exercises)
              .filter((exercise) => exercise.id?.startsWith('custom:'))
              .map((exercise) => [exercise.id, exercise]),
          ).values(),
        ]}
        defaultRest={{
          restEnabled: state.restEnabled,
          restSeconds: state.restSeconds,
        }}
        initialSession={editing ?? undefined}
        onCancel={() => {
          setBuilding(false);
          setEditing(null);
        }}
        onSave={saveSession}
      />
    );

  return (
    <div>
      <div className="section-heading">
        <div>
          <h1 className="page-title">Plan</h1>
          <p className="page-subtitle">
            {state.planName || 'Tu estructura de entrenamiento'}
          </p>
        </div>
        <Button
          aria-label="Cambiar nombre del plan"
          variant="ghost"
          size="icon"
          className="size-11 rounded-full"
          onClick={() => setPlanNameDraft(state.planName)}
        >
          <Pencil className="size-4" />
        </Button>
      </div>
      <ViewTabs
        label="Secciones del plan"
        value={view}
        onChange={setView}
        items={[
          { id: 'week', label: 'Semana' },
          { id: 'routines', label: 'Rutinas' },
          { id: 'structure', label: 'Tramos' },
        ]}
      />
      {view === 'routines' ? (
        <PlanSharing state={state} updateState={updateState} />
      ) : null}
      {view === 'routines' ? (
        <RotationSettings state={state} updateState={updateState} />
      ) : null}
      <Dialog
        open={planNameDraft !== null}
        onOpenChange={(open) => {
          if (!open) setPlanNameDraft(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Nombre del plan</DialogTitle>
          <DialogDescription>
            Un nombre para tu programa de entrenamiento.
          </DialogDescription>
          <input
            aria-label="Nombre del plan"
            className="h-12 rounded-xl border border-border bg-background px-3 text-base"
            value={planNameDraft ?? ''}
            onChange={(event) => setPlanNameDraft(event.target.value)}
          />
          <Button
            className="min-h-12 rounded-xl"
            onClick={() => {
              updateState((current) => ({
                ...current,
                planName: planNameDraft?.trim() ?? '',
              }));
              setPlanNameDraft(null);
            }}
          >
            Guardar nombre
          </Button>
        </DialogContent>
      </Dialog>

      <PlanPeriodEditor editor={editor} />
      {state.periods.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-muted text-primary">
            <CalendarDays />
          </span>
          <h2 className="mt-3 font-bold">Tu plan empieza con un tramo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ponle un nombre, define su duración y asígnale tus sesiones.
          </p>
          <Button
            className="mt-4 h-12 rounded-xl font-bold"
            onClick={() => openPeriodEditor()}
          >
            <Plus /> Crear primer tramo
          </Button>
        </section>
      ) : null}

      <PlanWeek editor={editor} />
      <PlanRoutineLibrary editor={editor} />
      <PlanStructure editor={editor} />
      <Dialog
        open={Boolean(deletingSession)}
        onOpenChange={(open) => {
          if (!open) setDeletingSession(null);
        }}
      >
        <DialogContent>
          <DialogTitle>¿Eliminar esta sesión?</DialogTitle>
          <DialogDescription>
            Se quitará de todos los tramos. Los entrenamientos registrados
            permanecerán en el historial.
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setDeletingSession(null)} variant="outline">
              Cancelar
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:brightness-95"
              onClick={() => {
                if (deletingSession) removeSession(deletingSession.id);
                setDeletingSession(null);
              }}
            >
              Eliminar sesión
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
