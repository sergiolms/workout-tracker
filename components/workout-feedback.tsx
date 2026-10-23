'use client';

import { useEffect, useState } from 'react';
import { Check, Cloud, CloudOff, LoaderCircle, Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { remainingRest, performanceTrend } from '@/lib/workout-experience';
import type { PersistenceStatus } from '@/lib/persistence';
import { useScreenWakeLock } from '@/hooks/use-screen-wake-lock';

export function GhostPerformance({ load, reps, previousLoad, previousReps, unit = 'kg' }: { load: number; reps: number; previousLoad: number; previousReps: number; unit?: string }) {
  const trend = performanceTrend(load, reps, previousLoad, previousReps);
  const reference = unit ? `${previousLoad} ${unit} × ${previousReps}` : `${previousReps} rep`;
  const meaning = { up: 'Por encima', down: 'Por debajo', same: 'Igual', mixed: 'Carga y repeticiones distintas' }[trend];
  return <span className={`ghost-performance ghost-${trend}`} title={`${meaning} respecto a la sesión anterior`} aria-label={`Anterior: ${previousLoad} ${unit}, ${previousReps} repeticiones. ${meaning}.`}><span aria-hidden="true">{trend === 'up' ? '↗' : trend === 'down' ? '↘' : '·'} {reference}</span></span>;
}

export function UndoNotice({ message, onUndo, onDismiss }: { message: string; onUndo: () => void; onDismiss: () => void }) {
  const [closing, setClosing] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setClosing(true), 5000); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (!closing) return; const timer = window.setTimeout(onDismiss, 180); return () => window.clearTimeout(timer); }, [closing, onDismiss]);
  return <div className="undo-notice" data-closing={closing}>
    <span aria-hidden="true" className="undo-progress" />
    <output className="relative min-w-0 flex-1 text-sm">{message}</output><Button disabled={closing} onClick={() => { setClosing(true); onUndo(); }} variant="ghost" className="relative min-h-11 shrink-0 rounded-xl font-bold">Deshacer</Button><button disabled={closing} type="button" aria-label="Cerrar aviso" className="relative grid size-11 shrink-0 place-items-center rounded-xl" onClick={() => setClosing(true)}><X className="size-4" /></button>
  </div>;
}

export function RestCountdown({ deadline, onDismiss }: { deadline: number; onDismiss: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const seconds = remainingRest(deadline, now);
  useScreenWakeLock(seconds > 0);
  useEffect(() => { if (!seconds) { const timer = window.setTimeout(onDismiss, 5000); return () => window.clearTimeout(timer); } }, [seconds, onDismiss]);
  return <aside className="rest-countdown" aria-label="Descanso entre series"><Timer className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">Descanso</span><span role="timer" className="text-lg font-bold tabular-nums">{seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '¡Siguiente serie!'}</span><output className="sr-only">{seconds === 0 ? 'Descanso terminado' : ''}</output></div><Button onClick={onDismiss} variant="outline" className="min-h-11 rounded-xl">{seconds ? 'Omitir' : 'Listo'}</Button></aside>;
}

export function RestDock({ deadline, onDismiss }: { deadline: number; onDismiss: () => void }) {
  return <div className="rest-dock"><div className="rest-dock-inner"><div className="rest-dock-spacing"><RestCountdown deadline={deadline} onDismiss={onDismiss} /></div></div></div>;
}

export function SaveStatus({ status }: { status: PersistenceStatus }) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const saving = status.local === 'saving' || status.cloud === 'pending';
  const saved = status.cloud === 'synced' && status.local === 'saved';
  const label = !online ? 'Sin conexión' : status.error ? 'Guardado sin confirmar' : !status.canEdit ? 'Conectando…' : saving ? 'Guardando…' : saved ? 'Guardado en Firebase' : 'Conectando…';
  return <output title={label} aria-label={label} className={`save-status ${status.error ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>{!online || status.error ? <CloudOff /> : saving ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : saved ? <Check /> : <Cloud />}<span>{label}</span></output>;
}
