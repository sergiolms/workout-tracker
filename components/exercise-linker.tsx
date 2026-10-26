'use client';
import { useDeferredValue, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ExerciseImage } from '@/components/exercises/exercise-media';
import { exerciseCatalogSections, getExerciseDisplayName } from '@/lib/exercise-catalog';

export function ExerciseLinker({ name, onLink }: { name: string; onLink: (catalogId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(name);
  const deferred = useDeferredValue(query);
  const results = exerciseCatalogSections(deferred).flatMap(section => section.items).slice(0, 30);
  return <><Button variant="outline" className="min-h-11" onClick={() => setOpen(true)}>Vincular al catálogo</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="flex max-h-[90dvh] flex-col"><DialogTitle>Identificar ejercicio</DialogTitle><DialogDescription>Elige una coincidencia exacta de movimiento y material. Se conservará el nombre original del registro.</DialogDescription><label className="text-sm">Buscar<input className="mt-1 h-12 w-full rounded border border-border bg-background px-3 text-base" value={query} onChange={event => setQuery(event.target.value)} /></label><p className="text-sm text-muted-foreground">Hasta 30 resultados. Afina la búsqueda si falta el ejercicio.</p><ul className="min-h-0 flex-1 overflow-y-auto">{results.map(item => <li key={item.id}><button className="flex min-h-16 w-full items-center gap-3 border-b border-border py-2 text-left" type="button" onClick={() => { onLink(item.id); setOpen(false); }}><span className="size-14 shrink-0 overflow-hidden rounded"><ExerciseImage image={item.image} name={getExerciseDisplayName(item.name, item.id)} /></span><span>{getExerciseDisplayName(item.name, item.id)}</span></button></li>)}</ul>{!results.length ? <output>No hay coincidencias. Puedes conservar el ejercicio sin vincular.</output> : null}</DialogContent></Dialog></>;
}
