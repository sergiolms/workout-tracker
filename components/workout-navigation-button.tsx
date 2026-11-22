'use client';
import { useEffect, useRef, useState } from 'react';
import { Dumbbell, Pause, Play, Square } from 'lucide-react';
import type { ActiveWorkout } from '@/lib/storage';
import { formatWorkoutTime } from '@/lib/workout-clock';
import { useWorkoutClock } from '@/hooks/use-workout-clock';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export function WorkoutNavigationButton({
  workout,
  name,
  active,
  editable,
  onSelect,
  onPause,
  onStop,
}: {
  workout?: ActiveWorkout;
  name: string;
  active: boolean;
  editable: boolean;
  onSelect: () => void;
  onPause: () => void;
  onStop: () => void;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const held = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const seconds = useWorkoutClock(workout);
  const label = workout
    ? `Hoy · ${workout.pausedAt ? 'Sesión en pausa' : 'Sesión en marcha'} · ${formatWorkoutTime(seconds)}`
    : 'Hoy';
  const clear = () => clearTimeout(timer.current);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Popover
      open={Boolean(workout) && open}
      onOpenChange={(value, details) => {
        if (details.reason === 'trigger-press') return;
        if (!value) setOpen(false);
      }}
    >
      <PopoverTrigger
        render={<button type="button" aria-label={label} />}
        className="nav-button select-none"
        data-featured="true"
        aria-current={active ? 'page' : undefined}
        aria-label={
          workout
            ? `Hoy · ${workout.pausedAt ? 'Sesión en pausa' : 'Sesión en marcha'} · ${formatWorkoutTime(seconds)}`
            : 'Hoy'
        }
        aria-description={
          workout
            ? 'Mantén pulsado o pulsa flecha arriba para acceder a los controles de la sesión'
            : undefined
        }
        style={{ WebkitTouchCallout: 'none' }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          held.current = false;
          origin.current = { x: e.clientX, y: e.clientY };
          clear();
          if (workout)
            timer.current = setTimeout(() => {
              held.current = true;
              setOpen(true);
            }, 500);
        }}
        onPointerMove={(e) => {
          if (
            Math.hypot(
              e.clientX - origin.current.x,
              e.clientY - origin.current.y,
            ) > 10
          )
            clear();
        }}
        onPointerUp={clear}
        onPointerCancel={() => {
          clear();
          held.current = false;
        }}
        onPointerLeave={clear}
        onContextMenu={(e) => {
          if (workout) {
            e.preventDefault();
            clear();
            held.current = true;
            setOpen(true);
          }
        }}
        onKeyDown={(e) => {
          if (workout && e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        onClick={(e) => {
          e.preventDefault();
          if (held.current) {
            held.current = false;
            return;
          }
          setOpen(false);
          onSelect();
        }}
      >
        <span className="nav-icon relative">
          <Dumbbell className="size-7" strokeWidth={active ? 2.5 : 2} />
          {workout ? (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-md border border-primary/20 bg-background px-1 text-[10px] font-bold leading-4 tabular-nums text-foreground">
              {workout.pausedAt ? 'Ⅱ ' : ''}
              {formatWorkoutTime(seconds)}
            </span>
          ) : null}
        </span>
        <span className="nav-label">Hoy</span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={12}
        className="w-64 rounded-xl p-3"
      >
        <PopoverTitle>{name}</PopoverTitle>
        <p className="text-sm text-muted-foreground">
          {workout?.pausedAt ? 'En pausa' : 'En marcha'} ·{' '}
          {formatWorkoutTime(seconds)}
        </p>
        <Button
          variant="outline"
          disabled={!editable}
          onClick={() => {
            onPause();
            setOpen(false);
          }}
        >
          {workout?.pausedAt ? <Play /> : <Pause />}
          {workout?.pausedAt ? 'Reanudar' : 'Pausar'}
        </Button>
        <Button
          variant="outline"
          disabled={!editable}
          onClick={() => {
            setOpen(false);
            onStop();
          }}
        >
          <Square />
          Parar sesión…
        </Button>
      </PopoverContent>
    </Popover>
  );
}
