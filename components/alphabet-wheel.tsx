'use client';

import { useEffect, useEffectEvent, useId, useRef } from 'react';
import { advanceAlphabetIndex, resolveAlphabetIndex } from '@/lib/alphabet-navigation';

const ROW_HEIGHT = 32;

export function AlphabetWheel({ letters, availableLetters = letters, value, onChange }: { letters: string[]; availableLetters?: string[]; value: string; onChange: (letter: string) => void }) {
  const index = Math.max(0, letters.indexOf(value));
  const id = useId();
  const wheel = useRef<HTMLDivElement>(null);
  const selected = useRef(index);
  const gesture = useRef<{ pointer: number; y: number; startY: number; remainder: number; position: number } | null>(null);
  const dragged = useRef(false);
  const wheelInput = useRef({ remainder: 0, time: 0 });
  useEffect(() => { selected.current = index; }, [index]);
  const select = (next: number) => {
    const resolved = resolveAlphabetIndex(letters, availableLetters, next, next >= selected.current ? 1 : -1, selected.current);
    if (resolved === selected.current) return;
    selected.current = resolved;
    onChange(letters[resolved]);
  };
  const advance = (steps: number) => select(advanceAlphabetIndex(letters, availableLetters, selected.current, steps));
  const handleWheel = useEffectEvent((event: WheelEvent) => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    const input = wheelInput.current;
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1);
    if (event.timeStamp - input.time > 180 || Math.sign(pixels) !== Math.sign(input.remainder)) input.remainder = 0;
    input.time = event.timeStamp;
    input.remainder += pixels;
    const steps = Math.trunc(input.remainder / ROW_HEIGHT);
    if (steps) { input.remainder -= steps * ROW_HEIGHT; advance(steps); }
  });
  useEffect(() => {
    const element = wheel.current;
    if (!element) return;
    // React's delegated wheel listener is passive; this one must consume the gesture.
    const onWheel = (event: WheelEvent) => handleWheel(event);
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);
  const finishGesture = () => { gesture.current = null; };
  return <div className="alphabet-wheel-shell" data-feedback="flow" data-swipe-ignore title="Desliza arriba o abajo para cambiar de sección">
    {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Native select cannot expose a five-position wheel. */}
    <div ref={wheel} role="listbox" aria-label="Índice alfabético de ejercicios" aria-orientation="vertical" aria-activedescendant={`${id}-${index}`} tabIndex={0} className="alphabet-wheel"
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return;
        dragged.current = false;
        gesture.current = { pointer: event.pointerId, y: event.clientY, startY: event.clientY, remainder: 0, position: letters.indexOf((event.target as HTMLElement).closest('[role="option"]')?.getAttribute('aria-label') ?? '') };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus({ preventScroll: true });
      }}
      onPointerMove={event => {
        const input = gesture.current;
        if (!input || event.pointerId !== input.pointer) return;
        if (Math.abs(event.clientY - input.startY) > 5) dragged.current = true;
        input.remainder += input.y - event.clientY;
        input.y = event.clientY;
        const steps = Math.trunc(input.remainder / ROW_HEIGHT);
        if (steps) { input.remainder -= steps * ROW_HEIGHT; advance(steps); }
      }}
      onPointerUp={() => {
        const input = gesture.current;
        if (input && !dragged.current && input.position >= 0 && availableLetters.includes(letters[input.position])) select(input.position);
        finishGesture();
      }} onPointerCancel={finishGesture} onLostPointerCapture={finishGesture}
      onClickCapture={event => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); } }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); advance(event.key === 'ArrowDown' ? 1 : -1); return; }
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? letters.length - 1 : letters.findIndex(letter => letter.toLocaleLowerCase('es') === event.key.toLocaleLowerCase('es'));
        if (next < 0) return;
        event.preventDefault(); select(next);
      }}>
      <div className="alphabet-wheel-track" style={{ transform: `translateY(${64 - index * ROW_HEIGHT}px)` }}>
      {letters.map((letter, position) => {
        const distance = Math.abs(position - index);
        const enabled = availableLetters.includes(letter);
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Buttons implement options within the keyboard-controlled listbox.
        return <button type="button" tabIndex={-1} aria-disabled={!enabled} key={letter} id={`${id}-${position}`} role="option" aria-selected={position === index} aria-label={letter} className="alphabet-wheel-option" data-active={position === index} data-distance={Math.min(2, distance)} onClick={() => { if (enabled) select(position); wheel.current?.focus({ preventScroll: true }); }}>
          <span aria-hidden="true">{!enabled ? letter.toLocaleLowerCase('es') : distance > 1 ? '−' : position === index ? letter.toLocaleUpperCase('es') : letter.toLocaleLowerCase('es')}</span>
        </button>;
      })}
      </div>
    </div>
  </div>;
}
