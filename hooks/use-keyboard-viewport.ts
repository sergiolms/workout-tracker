'use client';
import { useEffect } from 'react';

// Safari pans the visual viewport independently of our inner scrolling area.
// Size the shell to that viewport and clear the outer scroll after dismissal.
export function useKeyboardViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let frame = 0;
    let settle: ReturnType<typeof setTimeout>;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Preserve pinch zoom and its native panning.
        if (viewport.scale !== 1) return;
        document.documentElement.style.setProperty(
          '--app-height',
          `${viewport.height}px`,
        );
        document.documentElement.style.setProperty(
          '--app-top',
          `${viewport.offsetTop}px`,
        );
      });
    };
    const restore = () => {
      clearTimeout(settle);
      settle = setTimeout(() => {
        const active = document.activeElement;
        if (
          active instanceof HTMLElement &&
          (active.matches('input, textarea, select') ||
            active.isContentEditable)
        )
          return;
        if (viewport.scale === 1) window.scrollTo(0, 0);
        update();
      }, 300);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusout', restore);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusout', restore);
      document.documentElement.style.removeProperty('--app-height');
      document.documentElement.style.removeProperty('--app-top');
    };
  }, []);
}
