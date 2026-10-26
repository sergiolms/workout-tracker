'use client';

import {
  Activity,
  Dumbbell,
  Footprints,
  HeartPulse,
  Timer,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MeasurementTracker } from '@/components/measurement-tracker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { planProgress } from '@/lib/plan-progress';
import { type AppState, type CardioLog, type WorkoutLog } from '@/lib/storage';
import { historyTotals } from '@/lib/history-summary';
import { mobilityHistory, type MobilitySession } from '@/lib/mobility-history';
import { MobilityHistoryEntry } from '@/components/mobility-history-entry';
import { MobilityRoutine } from '@/components/mobility-routine';
import {
  ActivityHistoryEditor,
  ActivityDeleteDialog,
} from '@/components/activity-history-editor';
import { ActivityCalendar } from '@/components/activity-calendar';
import {
  ActivityHistoryEntry,
  HistoryBrowser,
  WorkoutHistoryEntry,
} from '@/components/training-history';
import { ViewTabs } from '@/components/view-tabs';
import { applyActivityEdit } from '@/lib/activity-history';
import { moveToTrash } from '@/lib/record-trash';
import { RecordTrash } from '@/components/record-trash';
import { WorkoutHistoryEditor } from '@/components/workout-history-editor';
import { ProgressRing } from '@/components/progress-ring';
import { ExerciseProgress } from '@/components/exercise-history';
import { WeeklyTrainingVolume } from '@/components/weekly-training-volume';
import { PastWorkoutRecorder } from '@/components/past-workout-recorder';

export function ProgressView({
  editable,
  state,
  updateState,
}: {
  editable: boolean;
  state: AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
}) {
  const [view, setView] = useState<
    'overview' | 'exercises' | 'measurements' | 'history'
  >('overview');
  const [historyKind, setHistoryKind] = useState<
    'workouts' | 'activities' | 'mobility'
  >('workouts');
  const [editingActivity, setEditingActivity] = useState<CardioLog | null>(
    null,
  );
  const [deletingActivity, setDeletingActivity] = useState<CardioLog | null>(
    null,
  );
  const [editingWorkout, setEditingWorkout] = useState<WorkoutLog | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<WorkoutLog | null>(
    null,
  );
  const [editingMobility, setEditingMobility] =
    useState<MobilitySession | null>(null);
  const mobility = mobilityHistory(state.mobilityDone);
  const totals = historyTotals(state);
  const strengthSessions = totals.workouts;
  const cardioMinutes = totals.cardioMinutes;
  const steps = totals.steps;
  const totalWeeks = state.plan.length;
  const activeWeek = state.plan.find((week) => week.week === state.week);
  const planStatus = planProgress(state.plan, state);
  const painFree = totals.painKnown
    ? Math.round((totals.painFree / totals.painKnown) * 100)
    : null;
  const deleteWorkout = () => {
    if (!deletingWorkout) return;
    updateState((current) =>
      moveToTrash(current, 'workoutLogs', deletingWorkout.id),
    );
    setDeletingWorkout(null);
  };
  return (
    <div>
      <div className="section-heading">
        <div>
          <h1 className="page-title">Progreso</h1>
          <p className="page-subtitle">Tu actividad y evolución</p>
        </div>
      </div>
      <ViewTabs
        label="Secciones de progreso"
        value={view}
        onChange={setView}
        items={[
          { id: 'overview', label: 'Resumen' },
          { id: 'exercises', label: 'Ejercicios' },
          { id: 'measurements', label: 'Medidas' },
          { id: 'history', label: 'Historial' },
        ]}
      />
      {view === 'overview' ? (
        <>
          <div className="metric-grid">
            <Metric
              icon={Dumbbell}
              label="Entrenamientos"
              value={`${strengthSessions}`}
              detail="registrados"
            />
            <Metric
              icon={Timer}
              label="Cardio"
              value={`${cardioMinutes}`}
              detail="minutos"
            />
            <Metric
              icon={Footprints}
              label="Pasos"
              value={steps.toLocaleString('es-ES')}
              detail="registrados"
            />
            <Metric
              icon={HeartPulse}
              label="Sin molestias"
              value={painFree === null ? '—' : `${painFree}%`}
              detail={painFree === null ? 'sin registros' : 'ejercicios'}
            />
          </div>
          <ActivityCalendar
            state={state}
            mobility={mobility}
            onMobilitySelect={setEditingMobility}
            workouts={state.workoutLogs}
            activities={state.cardioLogs}
            onWorkoutSelect={setEditingWorkout}
            onActivitySelect={setEditingActivity}
          />
          <WeeklyTrainingVolume state={state} />
          <section className="surface mt-4 flex items-center gap-4 p-5">
            <ProgressRing
              className="size-16 text-base"
              value={
                planStatus.total
                  ? (planStatus.done / planStatus.total) * 100
                  : 0
              }
              label={`${planStatus.total ? Math.round((planStatus.done / planStatus.total) * 100) : 0}%`}
              description="Plan completado"
            />
            <div>
              <h2 className="font-bold">Tu plan</h2>
              <p className="mt-1 text-sm">
                {planStatus.done} de {planStatus.total} sesiones
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {totalWeeks
                  ? `Semana ${state.week} de ${totalWeeks} · ${activeWeek?.block ?? ''}`
                  : 'Crea un plan para ver tu progresión.'}
              </p>
            </div>
          </section>
        </>
      ) : null}
      {view === 'exercises' ? <ExerciseProgress state={state} /> : null}
      {view === 'measurements' ? (
        <MeasurementTracker state={state} updateState={updateState} />
      ) : null}
      {view === 'history' ? (
        <>
          <ViewTabs
            label="Tipo de historial"
            value={historyKind}
            onChange={setHistoryKind}
            items={[
              { id: 'workouts', label: 'Entrenamientos' },
              { id: 'activities', label: 'Actividad' },
              { id: 'mobility', label: 'Movilidad' },
            ]}
          />
          {historyKind === 'workouts' ? (
            <>
              <PastWorkoutRecorder
                state={state}
                editable={editable}
                updateState={updateState}
              />
              <HistoryBrowser
                state={state}
                title="Historial de entrenamientos"
                entries={state.workoutLogs}
                searchText={(log) =>
                  [
                    log.routineName,
                    log.notes,
                    ...log.exercises.map((item) => item.name),
                  ].join(' ')
                }
                renderEntry={(workout) => (
                  <WorkoutHistoryEntry
                    state={state}
                    workout={workout}
                    onEdit={() => setEditingWorkout(workout)}
                    onDelete={() => setDeletingWorkout(workout)}
                  />
                )}
              />
            </>
          ) : historyKind === 'activities' ? (
            <HistoryBrowser
              state={state}
              title="Actividad registrada"
              entries={state.cardioLogs}
              searchText={(log) => log.type}
              renderEntry={(log) => (
                <ActivityHistoryEntry
                  activity={log}
                  onEdit={() => setEditingActivity(log)}
                  onDelete={() => setDeletingActivity(log)}
                />
              )}
            />
          ) : (
            <HistoryBrowser
              state={state}
              title="Movilidad registrada"
              entries={mobility}
              searchText={(session) =>
                [session.mode, ...session.exercises].join(' ')
              }
              renderEntry={(session) => (
                <MobilityHistoryEntry
                  session={session}
                  onEdit={() => setEditingMobility(session)}
                />
              )}
            />
          )}
        </>
      ) : null}
      <Dialog
        open={editingMobility !== null}
        onOpenChange={(open) => {
          if (!open) setEditingMobility(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>Movilidad</DialogTitle>
          <DialogDescription>
            {editingMobility
              ? new Date(`${editingMobility.date}T12:00:00`).toLocaleDateString(
                  'es-ES',
                  { dateStyle: 'long' },
                )
              : ''}
          </DialogDescription>
          {editingMobility ? (
            <fieldset disabled={!editable}>
              <MobilityRoutine
                key={editingMobility.id}
                state={state}
                updateState={updateState}
                day={editingMobility.date}
                initialMode={editingMobility.mode}
              />
            </fieldset>
          ) : null}
        </DialogContent>
      </Dialog>
      {editingActivity ? (
        <ActivityHistoryEditor
          key={editingActivity.id}
          activity={editingActivity}
          editable={
            editable &&
            state.cardioLogs.some((log) => log.id === editingActivity.id)
          }
          dark={
            state.theme === 'dark' ||
            (state.theme === 'system' &&
              typeof window !== 'undefined' &&
              window.matchMedia('(prefers-color-scheme: dark)').matches)
          }
          onSave={(edited) =>
            updateState((current) =>
              applyActivityEdit(current, editingActivity.id, edited),
            )
          }
          onClose={() => setEditingActivity(null)}
          onDelete={() => {
            setDeletingActivity(editingActivity);
            setEditingActivity(null);
          }}
        />
      ) : null}
      {deletingActivity ? (
        <ActivityDeleteDialog
          editable={editable}
          dark={
            state.theme === 'dark' ||
            (state.theme === 'system' &&
              typeof window !== 'undefined' &&
              window.matchMedia('(prefers-color-scheme: dark)').matches)
          }
          onClose={() => setDeletingActivity(null)}
          onConfirm={() => {
            updateState((current) =>
              moveToTrash(current, 'cardioLogs', deletingActivity.id),
            );
            setDeletingActivity(null);
          }}
        />
      ) : null}
      {editingWorkout ? (
        <WorkoutHistoryEditor
          editable={editable}
          key={editingWorkout.id}
          state={state}
          workout={editingWorkout}
          onSave={updateState}
          onClose={() => setEditingWorkout(null)}
        />
      ) : null}
      <Dialog
        open={Boolean(deletingWorkout)}
        onOpenChange={(open) => {
          if (!open) setDeletingWorkout(null);
        }}
      >
        <DialogContent>
          <DialogTitle>¿Borrar este entrenamiento?</DialogTitle>
          <DialogDescription>
            Se eliminará esta sesión y los registros de ejercicios vinculados.
            Podrás restaurarlos desde Registros eliminados, en Progreso o
            Perfil.
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setDeletingWorkout(null)} variant="outline">
              Cancelar
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:brightness-95"
              onClick={deleteWorkout}
            >
              <Trash2 /> Borrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <RecordTrash
        state={state}
        updateState={updateState}
        editable={editable}
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span>{label}</span>
      </div>
      <p className="mt-3 truncate text-[2rem] font-bold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
