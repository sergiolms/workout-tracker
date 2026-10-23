'use client';

import { useEffect, useEffectEvent, useRef } from 'react';
import { advanceAlphabetIndex, resolveAlphabetIndex } from '@/lib/alphabet-navigation';

export function AlphabetWheel({ letters, availableLetters = letters, value, onChange }: { letters: string[]; availableLetters?: string[]; value: string; onChange: (letter: string) => void }) {
  const index = Math.max(0, letters.indexOf(value));
  const track = useRef<HTMLDivElement>(null);
  const selected = useRef(index);
  const pointer = useRef<number | null>(null);
  const wheelInput = useRef({ pixels: 0, time: 0 });
  useEffect(() => { selected.current = index; }, [index]);
  const select = (next: number) => {
    const resolved = resolveAlphabetIndex(letters, availableLetters, next, next >= selected.current ? 1 : -1, selected.current);
    if (resolved === selected.current) return;
    selected.current = resolved; onChange(letters[resolved]);
  };
  const advance = (steps: number) => select(advanceAlphabetIndex(letters, availableLetters, selected.current, steps));
  const point = (clientY: number) => {
    const bounds = track.current?.getBoundingClientRect();
    if (bounds) select(Math.round(Math.max(0, Math.min(1, (clientY - bounds.top - 12) / Math.max(1, bounds.height - 24))) * (letters.length - 1)));
  };
  const onWheel = useEffectEvent((event: WheelEvent) => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    const input = wheelInput.current;
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1);
    if (event.timeStamp - input.time > 180 || Math.sign(pixels) !== Math.sign(input.pixels)) input.pixels = 0;
    input.time = event.timeStamp; input.pixels += pixels;
    const steps = Math.trunc(input.pixels / 40);
    if (steps) { input.pixels -= steps * 40; advance(steps); }
  });
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const listener = (event: WheelEvent) => onWheel(event);
    element.addEventListener('wheel', listener, { passive: false });
    return () => element.removeEventListener('wheel', listener);
  }, []);
  return <div className="alphabet-index" data-feedback="flow" data-swipe-ignore>
    {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The custom scrollbar combines alphabet landmarks with pointer scrubbing. */}
    <div ref={track} role="slider" aria-label="Sección del catálogo" aria-orientation="vertical" aria-valuemin={0} aria-valuemax={letters.length - 1} aria-valuenow={index} aria-valuetext={`Sección ${letters[index]}`} tabIndex={0} className="alphabet-index-track"
      onPointerDown={event => { if (!event.isPrimary || event.button !== 0) return; pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus({ preventScroll: true }); point(event.clientY); }}
      onPointerMove={event => { if (pointer.current === event.pointerId) point(event.clientY); }}
      onPointerUp={() => { pointer.current = null; }} onPointerCancel={() => { pointer.current = null; }} onLostPointerCapture={() => { pointer.current = null; }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); advance(event.key === 'ArrowDown' ? 1 : -1); return; }
        const target = event.key === 'Home' ? 0 : event.key === 'End' ? letters.length - 1 : letters.findIndex(letter => letter.toLocaleLowerCase('es') === event.key.toLocaleLowerCase('es'));
        if (target >= 0) { event.preventDefault(); select(target); }
      }}>
      {letters.map((letter, position) => <span aria-hidden="true" key={letter} className="alphabet-index-mark" data-active={position === index} data-near={Math.abs(position - index) <= 1} data-disabled={!availableLetters.includes(letter)} style={{ top: `calc(12px + (100% - 24px) * ${position / Math.max(1, letters.length - 1)})` }}><i /><span>{letter}</span></span>)}
    </div>
  </div>;
}
