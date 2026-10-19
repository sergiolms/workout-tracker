'use client';

import { useEffect } from 'react';
import { hapticFeedback } from '@/lib/haptics';

const controlSelector = 'button, [role="button"], [role="checkbox"], summary, input[type="checkbox"]';

export function useInteractionFeedback(haptics = true) {
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Map<HTMLElement, Animation>();
    let press: { control: HTMLElement; pointerId: number; x: number; y: number } | null = null;
    const controlFrom = (event: Event) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return null;
      const control = event.target.closest<HTMLElement>(controlSelector);
      return control && !control.matches(':disabled, [aria-disabled="true"]') && !control.closest('fieldset:disabled') ? control : null;
    };
    const release = () => {
      if (press) delete press.control.dataset.feedbackPressed;
      press = null;
    };
    const onPress = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      release();
      const control = controlFrom(event);
      if (!control) return;
      animations.get(control)?.cancel();
      animations.delete(control);
      control.dataset.feedbackPressed = 'true';
      press = { control, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const onMove = (event: PointerEvent) => {
      // Let a swipe scroll normally, without leaving a button visually pressed.
      if (press?.pointerId === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) release();
    };
    const onRelease = (event: PointerEvent) => { if (press?.pointerId === event.pointerId) release(); };
    const onInteraction = (event: MouseEvent) => {
      const control = controlFrom(event);
      if (!control) return;
      const kind = control.dataset.haptic;
      if (haptics && kind !== 'off') hapticFeedback(kind === 'success' || kind === 'warning' ? kind : 'tap');
      // Navigation flows between destinations; disclosures and selections express
      // their own state changes. Reserve a burst for an explicit confirmation.
      if (control.closest('[data-feedback="flow"]') || control.matches('summary, [aria-expanded], [aria-pressed], [role="checkbox"], input[type="checkbox"]')) return;
      if (kind !== 'success' && kind !== 'warning') return;
      if (motion.matches || typeof control.animate !== 'function') return;
      animations.get(control)?.cancel();
      const success = kind === 'success' || control.getAttribute('aria-checked') === 'true';
      const baseShadow = getComputedStyle(control).boxShadow;
      const shadowPrefix = baseShadow === 'none' ? '' : `${baseShadow}, `;
      const ring = (size: number, opacity: number) => `${shadowPrefix}0 0 0 ${size}px color-mix(in srgb, var(--primary) ${opacity}%, transparent)`;
      const animation = control.animate(
        kind === 'warning'
          ? [{ scale: '0.96', translate: '0' }, { scale: '1', translate: '-2px' }, { translate: '2px' }, { translate: '-1px' }, { scale: '1', translate: '0' }]
          : [
            { scale: '0.95', boxShadow: ring(0, 25) },
            { scale: success ? '1.025' : '1.015', boxShadow: ring(success ? 6 : 4, 15), offset: 0.45 },
            { scale: '1', boxShadow: ring(success ? 10 : 7, 0) },
          ],
        { duration: kind === 'warning' ? 300 : success ? 460 : 360, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
      animations.set(control, animation);
      animation.onfinish = () => animations.delete(control);
    };
    const onMotionChange = () => {
      if (motion.matches) {
        animations.forEach((animation) => animation.cancel());
        animations.clear();
      }
    };
    const onVisibility = () => { if (document.hidden) release(); };
    document.addEventListener('pointerdown', onPress, { capture: true, passive: true });
    document.addEventListener('pointermove', onMove, { capture: true, passive: true });
    document.addEventListener('pointerup', onRelease, true);
    document.addEventListener('pointercancel', onRelease, true);
    document.addEventListener('click', onInteraction, true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', release);
    motion.addEventListener('change', onMotionChange);
    return () => {
      release();
      document.removeEventListener('pointerdown', onPress, true);
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onRelease, true);
      document.removeEventListener('pointercancel', onRelease, true);
      document.removeEventListener('click', onInteraction, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', release);
      motion.removeEventListener('change', onMotionChange);
      animations.forEach((animation) => animation.cancel());
    };
  }, [haptics]);
}
