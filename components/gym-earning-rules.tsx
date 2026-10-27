'use client';
import { Coins, Repeat2, CalendarCheck } from 'lucide-react';
import { gymEconomy } from '@/lib/gym/catalog';
import { gymDay, gymProgress, gymWeek } from '@/lib/gym/engine';
import type { GymState } from '@/lib/gym/types';

export function GymEarningRules({ gym }: { gym: GymState }) {
  const progress = gymProgress(gym),
    today = gymDay(new Date().toISOString(), gym.timeZone);
  const daily = Math.floor(
    gymEconomy.dailyCredits *
      Math.min(1, progress.days.get(today)?.units ?? 0) +
      1e-9,
  );
  const week = progress.weeks.get(gymWeek(today));
  return (
    <section aria-label="Cómo ganar créditos" className="mb-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h3 className="text-lg font-semibold">Créditos repetibles</h3>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Coins className="size-4" aria-hidden="true" />
          {progress.balance} disponibles
        </span>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Los ganas al guardar entrenamientos, actividades o movilidad. Puedes
        gastarlos en la tienda del gimnasio.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <Repeat2 className="size-5 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold">
              Hasta {gymEconomy.dailyCredits} créditos/día
            </span>
          </div>
          <h4 className="mt-3 font-semibold">Entrenar y moverte</h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Una sesión de fuerza completa</li>
            <li>{gymEconomy.activityMinutesForFullDay} min de actividad</li>
            <li>
              {gymEconomy.mobilityMovementsForFullDay} movimientos de movilidad
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Son alternativas: puedes combinar partes, con un único máximo
            diario. Las sesiones parciales también suman.
          </p>
          <p className="mt-3 text-sm font-medium">
            Hoy: {daily} / {gymEconomy.dailyCredits}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <CalendarCheck className="size-5 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold">
              +{gymEconomy.weeklyBonus} créditos/semana
            </span>
          </div>
          <h4 className="mt-3 font-semibold">Primer día activo</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Media sesión,{' '}
            {gymEconomy.activityMinutesForFullDay *
              gymEconomy.qualifyingDayUnits}{' '}
            min de actividad o{' '}
            {gymEconomy.mobilityMovementsForFullDay *
              gymEconomy.qualifyingDayUnits}{' '}
            movimientos de movilidad en un día.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Se añade automáticamente una vez por semana. Puedes combinar
            actividades.
          </p>
          <p className="mt-3 text-sm font-medium">
            {week?.bonus ? 'Bonus conseguido' : 'Pendiente esta semana'}
          </p>
        </article>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Esta semana: {week?.earned ?? 0} / {gymEconomy.weeklyCap} créditos. La
        semana empieza el lunes.
      </p>
    </section>
  );
}
