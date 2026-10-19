'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Animate the existing DOM so drafts, focus and running timers stay intact.
export function MotionSurface({ motionKey, children, className, direction = 0 }: { motionKey: string; children: ReactNode; className?: string; direction?: -1 | 0 | 1 }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const element = ref.current;
    if (!element || motion.matches || typeof element.animate !== 'function') return;
    const animation = element.animate([{ opacity: 0.45, translate: direction ? `${direction * 24}px 0` : '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
    const onMotionChange = () => { if (motion.matches) animation.cancel(); };
    motion.addEventListener('change', onMotionChange);
    return () => { animation.cancel(); motion.removeEventListener('change', onMotionChange); };
  }, [motionKey, direction]);
  return <div ref={ref} className={className} data-motion-region>{children}</div>;
}

export function AnimatedDisclosure({ open, id, children }: { open: boolean; id?: string; children: ReactNode }) {
  return <div id={id} className="animated-disclosure" data-open={open} aria-hidden={!open} inert={!open}>
    <div className="min-h-0 overflow-hidden">{children}</div>
  </div>;
}
