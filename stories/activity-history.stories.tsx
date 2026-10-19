import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActivityHistoryEditor, ActivityDeleteDialog } from '@/components/activity-history-editor';
import { Button } from '@/components/ui/button';
import type { CardioLog } from '@/lib/storage';

const meta = { title: 'Entrenamiento/Editar actividad' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactivo: Story = { render: function ActivityStory(_args, context) {
  const [activity, setActivity] = useState<CardioLog>({ id: 'example-walk', date: '2026-10-19T08:30:00Z', type: 'Caminata', minutes: 30, distance: 2.5, steps: 3200, rpe: 4, heartRate: 110 });
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  if (deleted) return <div className="p-5"><output>Actividad eliminada del ejemplo</output><Button onClick={() => setDeleted(false)}>Restaurar ejemplo</Button></div>;
  return <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-5"><h1 className="text-xl font-bold">Actividad registrada</h1><p className="text-sm text-muted-foreground">Ejemplo en memoria · no se conecta a Firebase</p><output aria-label="Actividad guardada" className="block rounded-xl bg-muted p-4 text-sm">{activity.type} · {activity.minutes} min · {activity.distance ?? 0} km · {activity.steps ?? 0} pasos · RPE {activity.rpe ?? '—'} · {activity.heartRate ?? '—'} bpm</output><Button onClick={() => setOpen(true)} className="min-h-12 w-full rounded-xl">Editar actividad de ejemplo</Button>{open ? <ActivityHistoryEditor editable activity={activity} dark={context.globals.theme === 'dark'} onClose={() => setOpen(false)} onSave={setActivity} onDelete={() => { setOpen(false); setDeleting(true); }} /> : null}{deleting ? <ActivityDeleteDialog editable dark={context.globals.theme === 'dark'} onClose={() => setDeleting(false)} onConfirm={() => { setDeleted(true); setDeleting(false); }} /> : null}</div>;
} };
