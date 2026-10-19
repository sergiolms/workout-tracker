import assert from 'node:assert/strict';
import test from 'node:test';
import { hapticFeedback } from './haptics.ts';

test('las interacciones funcionan sin soporte háptico o si el navegador rechaza la vibración', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
    assert.equal(hapticFeedback(), false);
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { vibrate: () => { throw new Error('NotAllowedError'); } } });
    assert.equal(hapticFeedback('success'), false);
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { vibrate: () => false } });
    assert.equal(hapticFeedback('warning'), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else delete globalThis.navigator;
  }
});
