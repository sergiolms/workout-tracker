'use client';

import { useRef, type TouchEvent } from 'react';
import { swipeTargetIndex } from '@/lib/swipe-navigation';

const interactive = 'button, a, input, textarea, select, summary, [role="button"], [role="checkbox"], [role="switch"], [role="slider"], [contenteditable="true"], [data-swipe-ignore]';

export function useSwipeNavigation<T extends string>({ views, active, onNavigate }: { views: T[]; active: T; onNavigate: (view: T, direction: -1 | 1) => void }) {
  const start = useRef<{ id: number; x: number; y: number; time: number } | null>(null);
  return {
    onTouchStart(event: TouchEvent<HTMLElement>) {
      start.current = null;
      if (event.touches.length !== 1 || !(event.target instanceof Element) || !event.currentTarget.contains(event.target) || event.target.closest(interactive)) return;
      const touch = event.touches[0];
      const bounds = event.currentTarget.getBoundingClientRect();
      // Preserve browser back/forward gestures at the edges.
      if (touch.clientX < bounds.left + 24 || touch.clientX > bounds.right - 24) return;
      for (let element: Element | null = event.target; element && element !== event.currentTarget; element = element.parentElement) {
        if (element.scrollWidth > element.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(element).overflowX)) return;
      }
      start.current = { id: touch.identifier, x: touch.clientX, y: touch.clientY, time: performance.now() };
    },
    onTouchMove(event: TouchEvent<HTMLElement>) {
      if (!start.current) return;
      if (event.touches.length !== 1) { start.current = null; return; }
      const touch = event.touches[0];
      const dx = Math.abs(touch.clientX - start.current.x);
      const dy = Math.abs(touch.clientY - start.current.y);
      if (dy > 12 && dy > dx) start.current = null;
    },
    onTouchEnd(event: TouchEvent<HTMLElement>) {
      const origin = start.current;
      start.current = null;
      if (!origin || window.getSelection()?.type === 'Range') return;
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === origin.id);
      if (!touch) return;
      const current = views.indexOf(active);
      const target = swipeTargetIndex(current, views.length, { startX: origin.x, startY: origin.y, endX: touch.clientX, endY: touch.clientY, elapsed: performance.now() - origin.time });
      if (target !== null) onNavigate(views[target], target > current ? 1 : -1);
    },
    onTouchCancel() { start.current = null; },
  };
}
