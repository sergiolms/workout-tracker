'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ActivityHistoryEntry,
  WorkoutHistoryEntry,
} from '@/components/training-history';
import { activityCalendar } from '@/lib/activity-calendar';
import { localHistoryDay } from '@/lib/history-browser';
import type { CardioLog, WorkoutLog } from '@/lib/storage';

import { MobilityHistoryEntry } from '@/components/mobility-history-entry';
import type { MobilitySession } from '@/lib/mobility-history';
import {
  HistoryLoading,
  monthsBetween,
  useHistoryMonths,
} from '@/components/history-source';
import type { AppState } from '@/lib/storage';

const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const dateLabel = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
});

export function ActivityCalendar({
  workouts,
  activities,
  onWorkoutSelect,
  onActivitySelect,
  mobility = [],
  onMobilitySelect,
  state,
}: {
  state?: AppState;
  mobility?: MobilitySession[];
  onMobilitySelect?: (session: MobilitySession) => void;
  workouts: WorkoutLog[];
  activities: CardioLog[];
  onWorkoutSelect?: (workout: WorkoutLog) => void;
  onActivitySelect?: (activity: CardioLog) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const days = useMemo(
    () =>
      activityCalendar(
        workouts.map((log) => log.date),
        [
          ...activities.map((log) => log.date),
          ...mobility.map((log) => `${log.date}T12:00:00`),
        ],
        new Date(),
        monthOffset,
      ),
    [workouts, activities, mobility, monthOffset],
  );
  const month = days.find((day) => day.inMonth)!.date;
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  monthEnd.setMilliseconds(-1);
  const status = useHistoryMonths(
    state,
    monthsBetween(new Date(month.getFullYear(), month.getMonth(), 1), monthEnd),
  );
  const dayMobility = mobility.filter((log) => log.date === selected);
  const dayWorkouts = workouts.filter(
    (log) => localHistoryDay(log.date) === selected,
  );
  const dayActivities = activities.filter(
    (log) => localHistoryDay(log.date) === selected,
  );
  const activeDays = days.filter(
    (day) => day.inMonth && !day.future && day.count > 0,
  ).length;
  const total = days.reduce(
    (sum, day) => sum + (day.future || !day.inMonth ? 0 : day.count),
    0,
  );
  return (
    <section className="activity-calendar mt-4 rounded-2xl bg-card p-3 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Actividad</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {!status.loading && !status.error ? (
              <>
                {activeDays} {activeDays === 1 ? 'día activo' : 'días activos'}{' '}
                ·{' '}
              </>
            ) : null}
            toca un día para ver el detalle
          </p>
        </div>
        {monthOffset < 0 ? (
          <Button
            variant="ghost"
            className="min-h-11 shrink-0 rounded-xl"
            onClick={() => setMonthOffset(0)}
          >
            Este mes
          </Button>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-1">
        <Button
          aria-label="Mes anterior"
          size="icon"
          variant="ghost"
          className="size-11 shrink-0 rounded-xl"
          onClick={() => setMonthOffset((value) => value - 1)}
        >
          <ChevronLeft />
        </Button>
        <p
          aria-live="polite"
          className="text-center text-sm font-semibold capitalize"
        >
          {month.toLocaleDateString('es-ES', {
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <Button
          aria-label="Mes siguiente"
          size="icon"
          variant="ghost"
          className="size-11 shrink-0 rounded-xl"
          disabled={monthOffset === 0}
          onClick={() => setMonthOffset((value) => Math.min(0, value + 1))}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="activity-calendar-grid mt-2 mb-1" aria-hidden="true">
        {dayNames.map((name, index) => (
          <span
            key={index}
            className="text-center text-[11px] text-muted-foreground"
          >
            {name}
          </span>
        ))}
      </div>
      <HistoryLoading status={status}>
        <ol
          aria-label={`Actividad de ${month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`}
          className="activity-calendar-grid"
        >
          {days.map((day) => (
            <li key={day.key} aria-hidden={!day.inMonth || undefined}>
              {day.inMonth ? (
                <button
                  type="button"
                  disabled={day.future}
                  aria-label={`${dateLabel.format(day.date)} de ${day.date.getFullYear()}: ${day.future ? 'día futuro' : `${day.count} ${day.count === 1 ? 'actividad' : 'actividades'}`}`}
                  title={`${dateLabel.format(day.date)} · ${day.count} actividades`}
                  aria-current={day.today ? 'date' : undefined}
                  className="activity-calendar-day"
                  data-future={day.future || undefined}
                  data-level={Math.min(4, day.count)}
                  data-today={day.today || undefined}
                  onClick={() => setSelected(day.key)}
                />
              ) : null}
            </li>
          ))}
        </ol>
      </HistoryLoading>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {!status.loading && !status.error ? (
            <>
              {total} {total === 1 ? 'actividad' : 'actividades'} en el periodo
            </>
          ) : null}
        </span>
        <span className="flex items-center gap-1" aria-hidden="true">
          <span>Menos</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i
              key={level}
              className="activity-calendar-swatch"
              data-level={level}
            />
          ))}
          <span>Más</span>
        </span>
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden rounded-3xl sm:max-w-lg">
          <div className="shrink-0 pr-8">
            <DialogTitle>
              {selected
                ? new Date(`${selected}T12:00:00`).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Actividad del día'}
            </DialogTitle>
            <DialogDescription className="mt-2">
              {dayWorkouts.length + dayActivities.length + dayMobility.length}{' '}
              {dayWorkouts.length +
                dayActivities.length +
                dayMobility.length ===
              1
                ? 'registro'
                : 'registros'}
            </DialogDescription>
          </div>
          <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain pb-2">
            {dayWorkouts.map((workout) => (
              <WorkoutHistoryEntry
                key={workout.id}
                workout={workout}
                onEdit={
                  onWorkoutSelect
                    ? () => {
                        setSelected(null);
                        onWorkoutSelect(workout);
                      }
                    : undefined
                }
              />
            ))}
            {dayActivities.map((activity) => (
              <ActivityHistoryEntry
                key={activity.id}
                activity={activity}
                onEdit={
                  onActivitySelect
                    ? () => {
                        setSelected(null);
                        onActivitySelect(activity);
                      }
                    : undefined
                }
              />
            ))}
            {dayMobility.map((session) => (
              <MobilityHistoryEntry
                key={session.id}
                session={session}
                onEdit={
                  onMobilitySelect
                    ? () => {
                        setSelected(null);
                        onMobilitySelect(session);
                      }
                    : undefined
                }
              />
            ))}
            {!dayWorkouts.length &&
            !dayActivities.length &&
            !dayMobility.length ? (
              <p className="py-5 text-sm text-muted-foreground">
                No registraste entrenamientos ni actividades este día.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
