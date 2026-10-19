import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/number-stepper';
import { RestSettings } from '@/components/rest-settings';
import { RestCountdown, RestDock, GhostPerformance, SaveStatus, UndoNotice } from '@/components/workout-feedback';
import { ExercisePickerSheet, WorkoutReview } from '@/components/training-dialogs';

const meta = { title: 'Entrenamiento/Experiencia de sesión', parameters: { docs: { description: { component: 'Deshacer, descanso, referencias anteriores y revisión del entrenamiento. Datos de demostración en memoria; no utiliza Firebase.' } } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sesion: Story = { render: function SessionStory() {
  const [done, setDone] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const [restSeconds, setRestSeconds] = useState(90);
  const [undo, setUndo] = useState(0);
  const [load, setLoad] = useState(20);
  const [reps, setReps] = useState(12);
  const [picker, setPicker] = useState(false);
  const [review, setReview] = useState(false);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const stopRest = useCallback(() => setDeadline(null), []);
  const dismissUndo = useCallback(() => setUndo(0), []);
  const items = [{ name: 'Remo sentado', status: done ? 'done' as const : 'pending' as const }, { name: 'Press de pecho', status: 'pending' as const }, { name: 'Curl femoral', status: 'skipped' as const }];
  return <div data-rest-active={deadline !== null} className="training-story mx-auto max-w-lg space-y-4 rounded-2xl border border-border bg-background p-5">
    <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Sesión de ejemplo</p><h1 className="text-xl font-bold">Entrena a tu ritmo</h1></div><SaveStatus status={{ local: 'saved', cloud: 'synced', canEdit: true, error: '' }} /></div>
    <ExercisePickerSheet items={items} current={current} open={picker} onOpenChange={setPicker} onSelect={setCurrent} />
    <p className="text-sm text-muted-foreground">Prueba marcar y deshacer una serie, saltar el descanso y revisar antes de finalizar.</p>
    <div><p className="control-label">Carga</p><Stepper label="Carga de ejemplo" value={load} onChange={setLoad} step={0.5} suffix="kg" /></div>
    <div className="grid grid-cols-[1fr_48px] items-center gap-3"><div><Stepper label="Repeticiones de ejemplo" value={reps} onChange={setReps} /><div className="mt-1 text-center"><GhostPerformance load={load} reps={reps} previousLoad={20} previousReps={10} /></div></div><Checkbox aria-label="Serie de ejemplo hecha" className="size-12 rounded-xl after:inset-0" checked={done} onCheckedChange={value => { setDone(Boolean(value)); setUndo(Date.now()); if (value && auto) setDeadline(Date.now() + restSeconds * 1000); else stopRest(); }} /></div>
    <RestSettings enabled={auto} seconds={restSeconds} onEnabledChange={value => { setAuto(value); if (!value) stopRest(); }} onSecondsChange={setRestSeconds} />
    {undo ? <UndoNotice key={undo} message={done ? 'Serie marcada' : 'Serie desmarcada'} onDismiss={dismissUndo} onUndo={() => { setDone(!done); stopRest(); }} /> : null}
    <Button className="min-h-12 w-full rounded-xl" onClick={() => setReview(true)}>Finalizar entrenamiento</Button>
    <WorkoutReview open={review} onOpenChange={setReview} items={items} sets={done ? 1 : 0} minutes={24} onSelect={index => { setCurrent(index); setReview(false); }} onFinish={() => { setReview(false); setFinished(true); stopRest(); }} />
    {deadline !== null ? <RestDock key={deadline} deadline={deadline} onDismiss={stopRest} /> : null}
    {finished ? <output className="block text-sm text-primary">Ejemplo finalizado · ningún dato enviado</output> : null}
  </div>;
} };
export const Comparaciones: Story = { render: () => <div className="space-y-4 p-4"><p className="text-sm text-muted-foreground">Referencia anterior: 20 kg × 10. Carga y repeticiones deben ser comparables.</p>{[[22, 10], [20, 8], [22, 8], [20, 10]].map(([load, reps]) => <div key={`${load}:${reps}`} className="flex items-center gap-5"><strong>{load} kg × {reps}</strong><GhostPerformance load={load} reps={reps} previousLoad={20} previousReps={10} /></div>)}</div> };
export const EstadoDeGuardado: Story = { render: () => <div className="space-y-5 p-4"><SaveStatus status={{ local: 'saved', cloud: 'synced', canEdit: true, error: '' }} /><SaveStatus status={{ local: 'saving', cloud: 'pending', canEdit: true, error: '' }} /><SaveStatus status={{ local: 'saved', cloud: 'error', canEdit: false, error: 'Sin conexión' }} /></div> };
export const DescansoTerminado: Story = { render: function CompleteRest() { const [deadline] = useState(() => Date.now() - 1000); const [open, setOpen] = useState(true); return open ? <RestCountdown deadline={deadline} onDismiss={() => setOpen(false)} /> : <p className="p-4">Listo para seguir</p>; } };
