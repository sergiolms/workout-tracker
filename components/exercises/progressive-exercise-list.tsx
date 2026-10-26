'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

const BATCH_SIZE = 30;

export function ProgressiveExerciseList<T>({
  items,
  getKey,
  renderItem,
  label,
  busy = false,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  label: string;
  busy?: boolean;
}) {
  const [visible, setVisible] = useState(BATCH_SIZE);
  const viewport = useRef<HTMLUListElement>(null);
  const more = useRef<HTMLLIElement>(null);
  const shown = Math.min(visible, items.length);
  const hasMore = shown < items.length;
  useEffect(() => {
    if (
      !hasMore ||
      !more.current ||
      !viewport.current ||
      typeof IntersectionObserver === 'undefined'
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          !more.current?.contains(document.activeElement)
        )
          setVisible((count) => count + BATCH_SIZE);
      },
      { root: viewport.current, rootMargin: '160px' },
    );
    observer.observe(more.current);
    return () => observer.disconnect();
  }, [hasMore, shown]);
  return (
    <>
      <output className="sr-only">{busy ? 'Buscando…' : ''}</output>
      <ul
        ref={viewport}
        aria-label={label}
        aria-busy={busy}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
      >
        {items.slice(0, shown).map((item, index) => (
          <li
            key={getKey(item)}
            data-list-index={index}
            aria-posinset={index + 1}
            aria-setsize={items.length}
          >
            {renderItem(item)}
          </li>
        ))}
        {hasMore ? (
          <li ref={more}>
            <Button
              variant="ghost"
              className="my-2 min-h-11 w-full"
              onClick={() => {
                const firstNew = shown;
                setVisible((count) => count + BATCH_SIZE);
                requestAnimationFrame(() =>
                  viewport.current
                    ?.querySelector<HTMLButtonElement>(
                      `[data-list-index="${firstNew}"] button`,
                    )
                    ?.focus(),
                );
              }}
            >
              Mostrar más
            </Button>
          </li>
        ) : null}
      </ul>
    </>
  );
}
