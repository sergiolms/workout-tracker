'use client';

import { useEffect } from 'react';
import { hapticFeedback } from '@/lib/haptics';

export function useInteractionFeedback(haptics = true) {
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Map<HTMLElement, Animation>();
    const onInteraction = (event: MouseEvent) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>('button, [role="button"], [role="checkbox"], summary, input[type="checkbox"]');
      if (!control || control.matches(':disabled, [aria-disabled="true"]') || control.closest('fieldset:disabled')) return;
      const kind = control.dataset.haptic;
      if (haptics && kind !== 'off') hapticFeedback(kind === 'success' || kind === 'warning' ? kind : 'tap');
      if (motion.matches || typeof control.animate !== 'function') return;
      animations.get(control)?.cancel();
      const animation = control.animate(
        kind === 'warning' ? [{ translate: '0' }, { translate: '-3px' }, { translate: '3px' }, { translate: '0' }]
          : [{ scale: '0.96' }, { scale: kind === 'success' ? '1.035' : '1.015' }, { scale: '1' }],
        { duration: kind === 'success' ? 300 : 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
      animations.set(control, animation);
      animation.onfinish = () => animations.delete(control);
    };
    document.addEventListener('click', onInteraction, true);
    return () => {
      document.removeEventListener('click', onInteraction, true);
      animations.forEach((animation) => animation.cancel());
    };
  }, [haptics]);
}
