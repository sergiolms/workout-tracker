'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { GymEarningRules } from '@/components/gym-earning-rules';
import { Trophy } from 'lucide-react';
import { useHistorySource } from '@/components/history-source';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { gymAchievements, gymProgress } from '@/lib/gym/engine';
import type { GymCommand } from '@/lib/gym/types';
import type { AppState } from '@/lib/storage';

export function ProfileAchievements({
  state,
  editable,
}: {
  state: AppState;
  editable: boolean;
}) {
  const source = useHistorySource();
  const [restoring, setRestoring] = useState(false);
  const restore = useMutation(
    {
      mutationKey: ['account', source?.accountId, 'gym'],
      scope: { id: `gym:${source?.accountId}` },
      networkMode: 'always',
      retry: false,
      mutationFn: async (command: GymCommand) => {
        if (!source?.gymCommand) throw Error('El gimnasio no está disponible.');
        return source.gymCommand(command);
      },
      onSuccess: () => setRestoring(false),
    },
    source?.client,
  );
  const gym = state.gym;
  if (!gym)
    return (
      <output className="block py-8 text-sm text-muted-foreground">
        Preparando tu progreso…
      </output>
    );
  const progress = gymProgress(gym);
  return (
    <section className="py-6" aria-label="Logros y nivel">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-sm text-muted-foreground">Tu trayectoria</p>
          <h2 className="mt-1 text-3xl font-semibold">
            Nivel {progress.level}
          </h2>
        </div>
        <span className="text-sm text-muted-foreground">{progress.xp} XP</span>
      </div>
      <GymEarningRules gym={gym} />
      <h3 className="mb-2 text-lg font-semibold">Hitos y premios</h3>
      <p className="mb-5 text-sm text-muted-foreground">
        Cada premio se desbloquea una vez. Tu historial anterior también cuenta
        para estos hitos.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        {gymAchievements(gym).map((achievement) => (
          <article
            key={achievement.id}
            className="flex items-start gap-3 border-b border-border pb-5"
          >
            <Trophy
              aria-hidden="true"
              className={`mt-1 size-5 shrink-0 ${achievement.completed ? 'text-primary' : 'text-muted-foreground'}`}
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{achievement.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {Math.min(achievement.value, achievement.target)} /{' '}
                {achievement.target} {achievement.unit}
              </p>
              <progress
                aria-label={`Progreso de ${achievement.name}`}
                max={achievement.target}
                value={Math.min(achievement.value, achievement.target)}
                className="profile-achievement-progress my-3 block h-1.5 w-full"
              />
              <p
                className={`mt-3 text-sm ${achievement.reward.earned ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {achievement.reward.earned
                  ? '✓ Premio conseguido: '
                  : `${achievement.reward.condition} → `}
                {achievement.reward.name}
              </p>
              {achievement.completed ? (
                <p className="text-xs font-medium text-primary">
                  {achievement.completed}{' '}
                  {achievement.completed === 1
                    ? 'hito conseguido'
                    : 'hitos conseguidos'}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Los trofeos están en el inventario del gimnasio. Los hitos no dan
        créditos extra; los créditos se ganan con las actividades repetibles de
        arriba.
      </p>
      {state.gymArchive ? (
        <Button
          variant="outline"
          className="mt-6 min-h-11"
          disabled={!editable || restore.isPending}
          onClick={() => setRestoring(true)}
        >
          Restaurar gimnasio anterior
        </Button>
      ) : null}
      <Dialog
        open={restoring}
        onOpenChange={(open) => {
          if (!restore.isPending) setRestoring(open);
        }}
      >
        <DialogContent>
          <DialogTitle>Restaurar gimnasio anterior</DialogTitle>
          <DialogDescription>
            Volverás a la copia guardada antes de la importación. El gimnasio
            actual se conservará como copia anterior. Tus entrenamientos no
            cambian.
          </DialogDescription>
          {restore.error ? (
            <p role="alert" className="text-sm text-destructive">
              {restore.error.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={restore.isPending}
              onClick={() => setRestoring(false)}
            >
              Cancelar
            </Button>
            <Button
              className="min-h-11"
              disabled={!editable || restore.isPending}
              onClick={() => restore.mutate({ type: 'restore' })}
            >
              {restore.isPending ? 'Restaurando…' : 'Restaurar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
