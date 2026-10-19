'use client';
import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { AnimatedDisclosure } from '@/components/motion-surface';

export function OptionalSection({ title, summary, children, subtle = false }: { title: string; summary?: string; children: ReactNode; subtle?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <section className={subtle ? 'optional-section optional-subtle' : 'optional-section'}>
    <button type="button" aria-expanded={open} aria-controls={id} className="optional-trigger" onClick={() => setOpen(value => !value)}><span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span>{summary ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{summary}</span> : null}</span>{subtle ? <Plus aria-hidden="true" className={`size-4 shrink-0 transition-transform ${open ? 'rotate-45' : ''}`} /> : <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />}</button>
    <AnimatedDisclosure id={id} open={open}><div className="space-y-4 px-3 pb-4 pt-2">{children}</div></AnimatedDisclosure>
  </section>;
}
