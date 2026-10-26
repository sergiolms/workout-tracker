'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useScreenWakeLock } from '@/hooks/use-screen-wake-lock';
import { ProgressRing } from '@/components/progress-ring';
import { Stepper } from '@/components/number-stepper';
import { hapticFeedback } from '@/lib/haptics';

type TimerMode = 'descanso' | 'amrap' | 'hiit' | 'libre';

function formatClock(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function WorkoutTimer() {
  const [mode, setMode] = useState<TimerMode>('descanso');
  const [duration, setDuration] = useState(90);
  const [work, setWork] = useState(40);
  const [rest, setRest] = useState(20);
  const [rounds, setRounds] = useState(8);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const wakeLock = useScreenWakeLock(running);
  const origin = useRef(0);
  const base = useRef(0);
  const total =
    mode === 'libre'
      ? Infinity
      : mode === 'hiit'
        ? (work + rest) * rounds - rest
        : duration;
  const finished = elapsed >= total;
  const cycle = work + rest;
  const round = Math.min(rounds, Math.floor(elapsed / cycle) + 1);
  const resting = mode === 'hiit' && elapsed % cycle >= work;
  const remaining = finished
    ? 0
    : mode === 'libre'
      ? elapsed
      : mode === 'hiit'
        ? (resting ? cycle : work) - (elapsed % cycle)
        : total - elapsed;
  const phase = finished
    ? 'Completado'
    : mode === 'hiit'
      ? `${resting ? 'Descanso' : 'Trabajo'} · ${round}/${rounds}`
      : mode === 'libre'
        ? 'Tiempo transcurrido'
        : mode.toUpperCase();

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const seconds =
        base.current + Math.floor((Date.now() - origin.current) / 1000);
      setElapsed(Math.min(seconds, total));
      if (seconds >= total) {
        setRunning(false);
        hapticFeedback('success');
      }
    };
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [running, total]);

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    base.current = 0;
  };
  const toggle = () => {
    if (running) {
      base.current = Math.min(
        total,
        base.current + Math.floor((Date.now() - origin.current) / 1000),
      );
      setElapsed(base.current);
      setRunning(false);
    } else {
      if (finished) {
        base.current = 0;
        setElapsed(0);
      }
      origin.current = Date.now();
      setRunning(true);
    }
  };
  return (
    <section className="timer-card">
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
          {(['descanso', 'amrap', 'hiit', 'libre'] as TimerMode[]).map(
            (item) => (
              <button
                key={item}
                aria-pressed={mode === item}
                className={`min-h-11 min-w-0 rounded-lg text-[11px] font-semibold ${mode === item ? 'bg-card shadow-sm' : ''}`}
                onClick={() => {
                  reset();
                  setMode(item);
                  setDuration(item === 'amrap' ? 600 : 90);
                }}
              >
                {item === 'libre'
                  ? 'Crono'
                  : item === 'descanso'
                    ? 'Descanso'
                    : item.toUpperCase()}
              </button>
            ),
          )}
        </div>
        {mode === 'amrap' || mode === 'hiit' ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {mode === 'amrap'
              ? 'AMRAP: completa tantas rondas como puedas dentro del tiempo.'
              : 'HIIT: alterna intervalos de trabajo y descanso.'}
          </p>
        ) : null}
        <fieldset
          disabled={running || elapsed > 0}
          className="mt-3 disabled:opacity-50"
        >
          {mode === 'hiit' ? (
            <div className="grid gap-2">
              {[
                ['Trabajo (s)', work, setWork, 5],
                ['Descanso (s)', rest, setRest, 5],
                ['Rondas', rounds, setRounds, 1],
              ].map(([label, value, setter, step]) => (
                <div
                  key={String(label)}
                  className="grid grid-cols-[1fr_150px] items-center gap-2"
                >
                  <span className="text-sm">{String(label)}</span>
                  <Stepper
                    label={String(label)}
                    value={Number(value)}
                    onChange={setter as (value: number) => void}
                    step={Number(step)}
                    min={Number(step)}
                  />
                </div>
              ))}
            </div>
          ) : mode !== 'libre' ? (
            <div className="flex gap-2">
              {(mode === 'amrap' ? [300, 600, 900, 1200] : [60, 90, 120]).map(
                (seconds) => (
                  <button
                    key={seconds}
                    aria-pressed={duration === seconds}
                    onClick={() => setDuration(seconds)}
                    className={`min-h-11 flex-1 rounded-xl border text-sm font-bold ${duration === seconds ? 'border-primary bg-primary/10' : 'border-border'}`}
                  >
                    {mode === 'amrap' ? `${seconds / 60} min` : `${seconds}s`}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </fieldset>
        <div className="timer-dial">
          <ProgressRing
            value={
              mode === 'libre'
                ? ((elapsed % 60) / 60) * 100
                : mode === 'hiit'
                  ? (1 - remaining / (resting ? rest : work)) * 100
                  : (elapsed / total) * 100
            }
            label={formatClock(remaining)}
            description="Tiempo del temporizador"
            className="size-[230px] text-[44px] font-bold tracking-tighter sm:size-[270px] sm:text-[52px]"
          />
        </div>
        <p role="timer" className="sr-only">
          {formatClock(remaining)}
        </p>
        <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
          {phase}
        </p>
        <div className="timer-controls">
          <Button
            aria-label="Reiniciar temporizador"
            className="size-12 rounded-full"
            onClick={reset}
            size="icon"
            variant="outline"
          >
            <RotateCcw />
          </Button>
          <Button
            aria-label={
              running ? 'Pausar temporizador' : 'Iniciar temporizador'
            }
            className="h-14 min-w-40 rounded-full text-base"
            onClick={toggle}
          >
            {running ? (
              <>
                <Pause /> Pausar
              </>
            ) : (
              <>
                <Play /> {elapsed ? 'Continuar' : 'Empezar'}
              </>
            )}
          </Button>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {wakeLock === 'held'
            ? 'Pantalla encendida mientras el temporizador está en marcha.'
            : 'Mantén la app visible para recibir el aviso al terminar.'}
        </p>
      </div>
    </section>
  );
}
