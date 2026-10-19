'use client';

import { useEffect, useId, useRef } from 'react';

const ROW_HEIGHT = 32;

export function AlphabetWheel({ letters, availableLetters = letters, value, onChange }: { letters: string[]; availableLetters?: string[]; value: string; onChange: (letter: string) => void }) {
  const options = letters;
  const index = Math.max(0, options.indexOf(value));
  const id = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const lastSelection = useRef<number | null>(null);
  const available = new Set(availableLetters);
  const resolve = (next: number, direction: number) => {
    const bounded = Math.max(0, Math.min(options.length - 1, next));
    for (let position = bounded; position >= 0 && position < options.length; position += direction) {
      if (available.has(options[position])) return position;
    }
    for (let position = bounded; position >= 0 && position < options.length; position -= direction) {
      if (available.has(options[position])) return position;
    }
    return index;
  };
  useEffect(() => {
    if (lastSelection.current === index) return;
    lastSelection.current = index;
    scroller.current?.scrollTo({ top: index * ROW_HEIGHT, behavior: 'instant' });
  }, [index]);
  const select = (next: number, direction = next >= index ? 1 : -1) => {
    const resolved = resolve(next, direction);
    lastSelection.current = resolved;
    scroller.current?.scrollTo({ top: resolved * ROW_HEIGHT, behavior: 'instant' });
    if (resolved !== index) onChange(options[resolved]);
  };
  return <div className="alphabet-wheel-shell" data-feedback="flow" data-swipe-ignore title="Desliza arriba o abajo para cambiar de sección">
    {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Native select cannot expose a five-position scroll wheel. */}
    <div ref={scroller} role="listbox" aria-label="Índice alfabético de ejercicios" aria-orientation="vertical" aria-activedescendant={`${id}-${index}`} tabIndex={0} className="alphabet-wheel"
      onScroll={event => {
        const next = Math.max(0, Math.min(options.length - 1, Math.round(event.currentTarget.scrollTop / ROW_HEIGHT)));
        const direction = next >= (lastSelection.current ?? index) ? 1 : -1;
        const resolved = resolve(next, direction);
        lastSelection.current = resolved;
        if (resolved !== next) event.currentTarget.scrollTo({ top: resolved * ROW_HEIGHT, behavior: 'instant' });
        if (resolved !== index) onChange(options[resolved]);
      }}
      onKeyDown={event => {
        const next = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : options.findIndex(letter => letter.toLocaleLowerCase('es') === event.key.toLocaleLowerCase('es'));
        if (next < 0 && event.key !== 'ArrowUp') return;
        event.preventDefault(); select(next);
      }}>
      {options.map((letter, position) => {
        const distance = Math.abs(position - index);
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Options are buttons inside the custom scrollable listbox.
        return <button type="button" tabIndex={-1} disabled={!available.has(letter)} key={letter} id={`${id}-${position}`} role="option" aria-selected={position === index} aria-label={letter} className="alphabet-wheel-option" data-active={position === index} data-distance={Math.min(2, distance)} onClick={() => { select(position); scroller.current?.focus({ preventScroll: true }); }}>
          <span aria-hidden="true">{!available.has(letter) ? letter.toLocaleLowerCase('es') : distance > 1 ? '—' : position === index ? letter.toLocaleUpperCase('es') : letter.toLocaleLowerCase('es')}</span>
        </button>;
      })}
    </div>
  </div>;
}
