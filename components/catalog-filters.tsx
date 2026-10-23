'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { bodyPartOptions, equipmentOptions, type CatalogFilters as Filters } from '@/lib/catalog-filters';

export function CatalogFilters({ value, onChange }: { value: Filters; onChange: (value: Filters) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const count = Number(Boolean(value.bodyPart)) + Number(Boolean(value.equipment));
  return <Dialog open={open} onOpenChange={next => { if (next) setDraft(value); setOpen(next); }}>
    <DialogTrigger render={<Button variant="outline" className="min-h-11 shrink-0 rounded-xl" />}><SlidersHorizontal className="size-4" /> Filtros{count ? ` (${count})` : ''}</DialogTrigger>
    <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden rounded-3xl sm:max-w-lg">
      <div className="shrink-0 pr-8"><DialogTitle>Filtrar catálogo</DialogTitle><DialogDescription className="mt-2">Combina una zona y un material.</DialogDescription></div>
      <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain pb-2">
        <fieldset><legend className="control-label mb-2">Zona</legend><div className="flex flex-wrap gap-2">{[['', 'Todas'], ...bodyPartOptions].map(([id, label]) => <button key={id} aria-pressed={(draft.bodyPart ?? '') === id} className="catalog-filter-choice" onClick={() => setDraft({ ...draft, bodyPart: id || undefined })} type="button">{label}</button>)}</div></fieldset>
        <fieldset><legend className="control-label mb-2">Material</legend><div className="flex flex-wrap gap-2">{[['', 'Todos'], ...equipmentOptions].map(([id, label]) => <button key={id} aria-pressed={(draft.equipment ?? '') === id} className="catalog-filter-choice" onClick={() => setDraft({ ...draft, equipment: id || undefined })} type="button">{label}</button>)}</div></fieldset>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-border pt-3"><Button variant="outline" className="min-h-12 rounded-xl" onClick={() => setDraft({})}>Limpiar</Button><Button className="min-h-12 flex-1 rounded-xl" onClick={() => { onChange(draft); setOpen(false); }}>Aplicar filtros</Button></div>
    </DialogContent>
  </Dialog>;
}
