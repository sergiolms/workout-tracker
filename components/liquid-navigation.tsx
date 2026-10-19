'use client';

import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';

type NavigationItem<T extends string> = { id: T; label: string; icon: LucideIcon };

export function LiquidNavigation<T extends string>({ items, active, onSelect, label = 'Navegación principal' }: { items: NavigationItem<T>[]; active: T; onSelect: (id: T) => void; label?: string }) {
  const root = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const previous = useRef<{ left: number; width: number } | null>(null);
  const running = useRef<Animation | null>(null);
  const activeIndex = items.findIndex((item) => item.id === active);

  useLayoutEffect(() => {
    const element = indicator.current;
    const container = root.current;
    if (!element || !container) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const origin = container.getBoundingClientRect().left;
    // An interrupted slide continues from its visible shape rather than jumping.
    const live = element.getBoundingClientRect();
    const from = running.current?.playState === 'running' ? { left: live.left - origin, width: live.width } : previous.current;
    running.current?.cancel();
    const target = element.getBoundingClientRect();
    const to = { left: target.left - origin, width: target.width };
    previous.current = activeIndex >= 0 ? to : null;
    if (activeIndex >= 0 && from && !motion.matches && Math.abs(to.left - from.left) > 0.5) {
      const distance = to.left - from.left;
      const stretch = Math.min(Math.abs(distance) * .38, to.width * 1.1);
      const middle = from.left + distance * .52;
      running.current = element.animate([
        { left: `${from.left}px`, width: `${from.width}px`, borderRadius: '16px' },
        { left: `${middle - stretch / 2}px`, width: `${to.width + stretch}px`, borderRadius: '22px 17px', offset: .48 },
        { left: `${to.left}px`, width: `${to.width}px`, borderRadius: '16px' },
      ], { duration: 430, easing: 'cubic-bezier(.22,.72,.18,1)' });
    }
    const onReduce = () => { if (motion.matches) running.current?.cancel(); };
    let width = container.clientWidth;
    const observer = new ResizeObserver(() => {
      if (container.clientWidth === width) return;
      width = container.clientWidth;
      running.current?.cancel();
      const rect = element.getBoundingClientRect();
      previous.current = activeIndex >= 0 ? { left: rect.left - container.getBoundingClientRect().left, width: rect.width } : null;
    });
    observer.observe(container);
    motion.addEventListener('change', onReduce);
    return () => { observer.disconnect(); motion.removeEventListener('change', onReduce); };
  }, [activeIndex, items.length]);

  useLayoutEffect(() => () => { running.current?.cancel(); }, []);

  return <nav ref={root} aria-label={label} data-feedback="flow" className="liquid-nav" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, '--nav-count': items.length } as CSSProperties}>
    <span ref={indicator} aria-hidden="true" className="liquid-nav-indicator" style={{ left: `calc(${(Math.max(0, activeIndex) + .5) / items.length * 100}% - var(--nav-pill-width) / 2)`, opacity: activeIndex >= 0 ? 1 : 0 }} />
    {items.map(({ id, label: itemLabel, icon: Icon }) => <button key={id} aria-current={active === id ? 'page' : undefined} className={`nav-button ${active === id ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => onSelect(id)} type="button"><Icon className="size-5" strokeWidth={active === id ? 2.7 : 2} />{itemLabel}</button>)}
  </nav>;
}
