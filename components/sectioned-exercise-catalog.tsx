'use client';

import { useRef, useState, type ReactNode } from 'react';
import { AlphabetWheel } from './alphabet-wheel';
import type { CatalogExercise } from '@/lib/exercise-catalog';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export type ExerciseSection = { letter: string; items: CatalogExercise[] };

export function SectionedExerciseCatalog({ sections, renderExercise }: { sections: ExerciseSection[]; renderExercise: (exercise: CatalogExercise) => ReactNode }) {
  const list = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(sections.find(section => alphabet.includes(section.letter))?.letter ?? 'A');
  const navigate = (letter: string) => {
    const viewport = list.current;
    if (letter === 'A' && viewport) {
      viewport.scrollTo({ top: 0, behavior: 'instant' });
      setActive('A');
      return;
    }
    const section = viewport?.querySelector<HTMLElement>(`[data-catalog-section="${letter}"]`);
    if (!viewport || !section) return;
    const top = letter === sections.at(-1)?.letter ? viewport.scrollHeight - viewport.clientHeight : section.offsetTop;
    viewport.scrollTo({ top, behavior: 'instant' });
    setActive(letter);
  };
  return <div className="sectioned-catalog" data-swipe-ignore>
    {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The scrollable catalogue needs keyboard access for PageUp, PageDown, Home and End. */}
    <section ref={list} aria-label="Catálogo de ejercicios por secciones" tabIndex={0} className="catalog-section-list"
      onScroll={event => {
        const viewport = event.currentTarget;
        if (viewport.scrollHeight <= viewport.clientHeight) return;
        const atEnd = viewport.scrollTop >= viewport.scrollHeight - viewport.clientHeight - 1;
        const headings = [...viewport.querySelectorAll<HTMLElement>('[data-catalog-section]')];
        const current = atEnd ? headings.at(-1) : headings.findLast(section => section.offsetTop <= viewport.scrollTop + 1);
        if (current) setActive(current.dataset.catalogSection === '#' ? 'A' : current.dataset.catalogSection ?? 'A');
      }}>
      {sections.map(section => <section key={section.letter} data-catalog-section={section.letter} aria-label={`Sección ${section.letter}`} className="catalog-letter-section">
        <h2 className="mb-2 text-lg font-bold text-primary">{section.letter}</h2>
        <div className="space-y-2">{section.items.map(item => <div key={item.id}>{renderExercise(item)}</div>)}</div>
      </section>)}
    </section>
    {sections.length > 0 ? <aside className="flex items-center justify-end"><AlphabetWheel letters={alphabet} availableLetters={sections.map(section => section.letter === '#' ? 'A' : section.letter)} value={active} onChange={navigate} /></aside> : null}
  </div>;
}
