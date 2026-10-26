'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlphabetWheel } from './alphabet-wheel';
import { virtualWindow } from '@/lib/virtual-catalog';
import type { CatalogExercise } from '@/lib/exercise-catalog';

const alphabet = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export type ExerciseSection = { letter: string; items: CatalogExercise[] };
type CatalogProps = { sections: ExerciseSection[]; renderExercise: (exercise: CatalogExercise) => ReactNode };

export function SectionedExerciseCatalog({ sections, renderExercise }: CatalogProps) {
  const list = useRef<HTMLElement>(null);
  const rows = useMemo(() => sections.flatMap(section => [{ key: `heading:${section.letter}`, letter: section.letter, item: null as CatalogExercise | null }, ...section.items.map(item => ({ key: item.id, letter: section.letter, item }))]), [sections]);
  const [sizes, setSizes] = useState<Map<string, number>>(new Map());
  const [position, setPosition] = useState({ top: 0, height: 600, width: 0 });
  const anchor = useRef<{ key: string; inset: number; end?: boolean } | null>(null);
  const estimate = sizes.get('estimate') ?? 100;
  const layout = useMemo(() => virtualWindow(rows.map(row => sizes.get(row.key) ?? (row.item ? estimate : 40)), position.top, position.height), [rows, sizes, estimate, position.top, position.height]);
  const layoutRef = useRef({ rows, layout });
  useLayoutEffect(() => { layoutRef.current = { rows, layout }; });
  const atEnd = position.top >= layout.total - position.height - 2 && layout.total > position.height;
  const active = atEnd ? sections.at(-1)?.letter : rows[layout.anchor]?.letter;

  useLayoutEffect(() => {
    const viewport = list.current; const saved = anchor.current;
    if (!viewport || !saved) return;
    const index = rows.findIndex(row => row.key === saved.key);
    if (index >= 0) viewport.scrollTop = saved.end ? layout.total : layout.offsets[index] + saved.inset;
    anchor.current = null;
    setPosition(old => ({ ...old, top: viewport.scrollTop }));
  }, [rows, layout.total, layout.offsets]);

  useEffect(() => {
    const viewport = list.current;
    if (!viewport) return;
    const resize = new ResizeObserver(() => {
      setPosition(old => {
        if (old.width !== viewport.clientWidth) setSizes(new Map());
        return { top: viewport.scrollTop, height: viewport.clientHeight, width: viewport.clientWidth };
      });
    });
    resize.observe(viewport);
    return () => resize.disconnect();
  }, []);

  useLayoutEffect(() => {
    const viewport = list.current;
    if (!viewport) return;
    const observer = new ResizeObserver(entries => {
      const current = layoutRef.current;
      const first = current.layout.anchor;
      const firstRow = current.rows[first];
      if (firstRow) anchor.current = { key: firstRow.key, inset: viewport.scrollTop - current.layout.offsets[first], end: viewport.scrollTop >= viewport.scrollHeight - viewport.clientHeight - 2 };
      setSizes(old => {
        const updated = new Map(old); let changed = false;
        for (const entry of entries) {
          const element = entry.target as HTMLElement; const key = element.dataset.virtualKey!;
          const height = Math.ceil(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height);
          if (height && old.get(key) !== height) { updated.set(key, height); changed = true; }
          if (height && element.dataset.item === 'true' && !old.has('estimate')) { updated.set('estimate', height); changed = true; }
        }
        if (!changed) anchor.current = null;
        return changed ? updated : old;
      });
    });
    for (const row of viewport.querySelectorAll('[data-virtual-key]')) observer.observe(row);
    return () => observer.disconnect();
  }, [layout.start, layout.end, rows]);

  const navigate = (letter: string) => {
    const viewport = list.current; const index = rows.findIndex(row => row.letter === letter);
    if (!viewport || index < 0) return;
    viewport.scrollTo({ top: letter === sections.at(-1)?.letter ? layout.total : layout.offsets[index], behavior: 'instant' });
    setPosition(old => ({ ...old, top: viewport.scrollTop }));
  };
  return <div className="sectioned-catalog" data-swipe-ignore>
    {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The virtual list is keyboard-scrollable with Home, End and PageUp/Down. */}
    <section ref={list} aria-label="Catálogo de ejercicios por secciones" tabIndex={0} className="catalog-section-list" onScroll={event => { const top = event.currentTarget.scrollTop; setPosition(old => ({ ...old, top })); }}>
      <div style={{ height: layout.total, position: 'relative' }}>
        {rows.slice(layout.start, layout.end).map((row, index) => <div key={row.key} data-virtual-key={row.key} data-item={Boolean(row.item)} style={{ position: 'absolute', top: layout.offsets[layout.start + index], insetInline: 0 }}>
          {row.item ? renderExercise(row.item) : <h2 data-catalog-section={row.letter} className="catalog-section-title">{row.letter}</h2>}
        </div>)}
      </div>
    </section>
    {sections.length && sections[0].letter !== 'Resultados' ? <AlphabetWheel letters={alphabet} availableLetters={sections.map(section => section.letter)} value={active ?? sections[0].letter} onChange={navigate} /> : null}
  </div>;
}
