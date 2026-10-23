'use client';

import { Check, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Item = { name: string; status: 'pending' | 'done' | 'partial' | 'skipped' };
const statusLabel = { done: 'Hecho', partial: 'Parcial', skipped: 'Omitido', pending: 'Pendiente' };

export function ExercisePickerSheet({ items, current, open, onOpenChange, onSelect, dark = false }: { items: Item[]; current: number; open: boolean; onOpenChange: (open: boolean) => void; onSelect: (index: number) => void; dark?: boolean }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger aria-label="Seleccionar ejercicio" className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-xl bg-card px-3 text-left"><span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{current + 1}/{items.length}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{items[current]?.name}</span><ChevronRight className="size-4 shrink-0 rotate-90 text-muted-foreground" /></DialogTrigger>
    <DialogContent className={`${dark ? 'dark' : ''} exercise-sheet`}>
      <div aria-hidden="true" className="mx-auto mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" /><DialogTitle>Ejercicios de la sesión</DialogTitle><DialogDescription>{items.filter(item => item.status === 'done').length}/{items.length} completados · elige dónde continuar</DialogDescription>
      <ul className="space-y-1">{items.map((item, index) => <li key={item.name}><button type="button" aria-current={index === current ? 'step' : undefined} onClick={() => { onSelect(index); onOpenChange(false); }} className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${index === current ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}><span className="w-5 shrink-0 text-center text-xs tabular-nums">{index + 1}</span><span className="min-w-0 flex-1">{item.name}</span>{item.status === 'done' ? <Check aria-label="Completado" className="size-5 shrink-0 text-emerald-600" /> : <span className="shrink-0 text-xs text-muted-foreground">{statusLabel[item.status]}</span>}</button></li>)}</ul>
    </DialogContent>
  </Dialog>;
}

export function WorkoutReview({ open, onOpenChange, items, sets, minutes, onSelect, onFinish, disabled = false, dark = false }: { open: boolean; onOpenChange: (open: boolean) => void; items: Item[]; sets: number; minutes: number | null; onSelect: (index: number) => void; onFinish: () => void; disabled?: boolean; dark?: boolean }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={`${dark ? 'dark' : ''} max-h-[85dvh] overflow-y-auto rounded-3xl sm:max-w-lg`}>
    <DialogTitle>Resumen del entrenamiento</DialogTitle><DialogDescription>{sets} series hechas{minutes ? ` · ${minutes} min en sesión` : ''}</DialogDescription>
    <ul className="space-y-1">{items.map((item, index) => <li key={item.name}><button type="button" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted" onClick={() => onSelect(index)}><span className="min-w-0 flex-1 text-sm">{item.name}</span><span className={`shrink-0 text-xs font-semibold ${item.status === 'done' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{statusLabel[item.status]}</span><ChevronRight className="size-4 shrink-0" /></button></li>)}</ul>
    <Button disabled={disabled} className="min-h-12 rounded-xl" onClick={onFinish}>Guardar y finalizar</Button><Button variant="outline" className="min-h-11 rounded-xl" onClick={() => onOpenChange(false)}>Seguir entrenando</Button>
  </DialogContent></Dialog>;
}
