'use client';
import { useEffect, useRef, useState } from 'react';
import {
  walkableGym,
  surfaceElevation,
  planGymInteraction,
  type GymAction,
  type GymInteraction,
  type Cell,
} from '@/lib/gym/avatar';
import type { GymState } from '@/lib/gym/types';
export { AvatarFigure } from './avatar-figure';
type CharacterPose = {
  cell: Cell;
  action: GymAction;
  elevation: number;
  layout: string;
  room: string;
};
export function useGymCharacter(gym: GymState, room: string, enabled: boolean) {
  const cells = walkableGym(gym, room),
    spawn = cells[0] ?? null;
  const layout = JSON.stringify(gym.placements),
    wandering = gym.avatar?.wandering ?? true;
  const [pose, setPose] = useState<CharacterPose | null>(null);
  const runtime = useRef<{
    cell: Cell | null;
    plan: GymInteraction | null;
    rest: number;
    step: number;
    phase: 'choose' | 'approach' | 'use' | 'leave';
    layout: string;
    room: string;
  }>({
    cell: null,
    plan: null,
    rest: 0,
    step: 0,
    phase: 'choose',
    layout: '',
    room,
  });
  useEffect(() => {
    if (!enabled || !wandering) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timer = window.setInterval(() => {
      if (document.hidden || motion.matches) return;
      const free = walkableGym(gym, room);
      if (!free.length) return;
      const current = runtime.current;
      if (
        current.room !== room ||
        current.layout !== layout ||
        !current.cell ||
        !free.some((p) => p.x === current.cell!.x && p.y === current.cell!.y)
      ) {
        current.room = room;
        current.layout = layout;
        if (
          !current.cell ||
          !free.some((p) => p.x === current.cell!.x && p.y === current.cell!.y)
        )
          current.cell = free[0];
        current.plan = null;
        current.phase = 'choose';
        current.rest = 0;
      }
      const show = (
        cell: Cell,
        action: GymAction,
        elevation = surfaceElevation(gym, room, cell),
      ) => setPose({ cell, action, elevation, layout, room });
      if (current.phase === 'use' && current.plan) {
        if (current.rest-- > 0) {
          show(
            current.plan.position,
            current.plan.action,
            current.plan.elevation,
          );
          return;
        }
        current.phase = 'leave';
        show(current.cell!, 'idle');
        return;
      }
      if (current.phase === 'leave') {
        current.phase = 'choose';
        current.plan = null;
        return;
      }
      if (current.phase === 'approach' && current.plan) {
        const next = current.plan.path.shift();
        if (next) {
          current.cell = next;
          show(next, 'walk');
          return;
        }
        current.phase = 'use';
        current.rest = current.plan.duration;
        show(
          current.plan.position,
          current.plan.action,
          current.plan.elevation,
        );
        return;
      }
      current.plan = planGymInteraction(
        gym,
        room,
        current.cell!,
        current.step++,
      );
      if (current.plan) current.phase = 'approach';
      else show(current.cell!, 'idle');
    }, 650);
    return () => window.clearInterval(timer);
  }, [gym, room, enabled, wandering, layout]);
  if (!enabled || !spawn) return null;
  return wandering && pose && pose.layout === layout && pose.room === room
    ? pose
    : {
        cell: spawn,
        action: 'idle' as const,
        elevation: surfaceElevation(gym, room, spawn),
        layout,
        room,
      };
}
