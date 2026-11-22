'use client';
import { useEffect, useState } from 'react';
import type { ActiveWorkout } from '@/lib/storage';
import { workoutSeconds } from '@/lib/workout-clock';
export function useWorkoutClock(workout?: ActiveWorkout) {
  const [now, setNow] = useState(Date.now);
  const running = Boolean(workout && !workout.pausedAt);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return workout ? workoutSeconds(workout, now) : 0;
}
