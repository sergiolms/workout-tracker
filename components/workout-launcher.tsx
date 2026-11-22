'use client';
import type { AppState } from '@/lib/storage';
import { nextPlanSession } from '@/lib/plan-progress';
import { nextRotationRoutine } from '@/lib/rotation';
import { Button } from '@/components/ui/button';

export function WorkoutLauncher({
  state,
  onStart,
  onPlan,
  notice,
}: {
  state: AppState;
  onStart: (week: number, routine: string) => void;
  onPlan: () => void;
  notice: string;
}) {
  const rotation = nextRotationRoutine(state);
  const slot = rotation
    ? { week: state.week, routine: rotation }
    : nextPlanSession(state.plan, state, state.week, '');
  const next = state.sessions.find((s) => s.id === slot?.routine);
  return (
    <div className="space-y-5">
      <div className="section-heading">
        <div>
          <h1 className="page-title">A entrenar</h1>
          <p className="page-subtitle">Tu próxima sesión empieza aquí</p>
        </div>
      </div>
      {notice ? (
        <output className="rounded-xl bg-primary/10 p-3 text-sm">
          {notice}
        </output>
      ) : null}
      <section className="surface rounded-2xl border border-border p-5">
        <p className="eyebrow">
          {next ? 'Siguiente sesión' : 'Prepara tu entrenamiento'}
        </p>
        <h2 className="mt-2 text-2xl font-bold">
          {next?.name ?? 'Elige cómo seguir'}
        </h2>
        {next && slot ? (
          <>
            <p className="my-3 text-sm text-muted-foreground">
              {next.exercises.length} ejercicios ·{' '}
              {state.rotation ? 'Rotación' : `Semana ${slot.week}`}
            </p>
            <Button
              className="h-14 w-full rounded-xl text-base"
              onClick={() => onStart(slot.week, next.id)}
            >
              Empezar {next.name}
            </Button>
          </>
        ) : (
          <>
            <p className="my-3 text-sm text-muted-foreground">
              {state.sessions.length
                ? 'Puedes repetir una rutina o ajustar tu plan.'
                : 'Crea una rutina para empezar.'}
            </p>
            <Button onClick={onPlan}>Abrir plan</Button>
          </>
        )}
      </section>
      {state.sessions.length ? (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Elegir otra sesión</h2>
          {state.sessions.map((s) => (
            <Button
              key={s.id}
              variant="outline"
              className="h-auto min-h-16 w-full justify-between rounded-xl p-4 text-left"
              onClick={() => onStart(state.week, s.id)}
            >
              <span>
                {s.name}
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {s.exercises.length} ejercicios
                </span>
              </span>
              <span className="text-sm">Empezar</span>
            </Button>
          ))}
        </section>
      ) : null}
    </div>
  );
}
