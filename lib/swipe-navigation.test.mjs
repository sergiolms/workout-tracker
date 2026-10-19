import assert from 'node:assert/strict';
import test from 'node:test';
import { swipeTargetIndex } from './swipe-navigation.ts';

const sample = { startX: 200, startY: 300, endX: 90, endY: 310, elapsed: 250 };
test('deslizar a izquierda avanza y a derecha retrocede, sin saltarse vistas', () => {
  assert.equal(swipeTargetIndex(1, 5, sample), 2);
  assert.equal(swipeTargetIndex(1, 5, { ...sample, endX: 310 }), 0);
});
test('no cambia de vista con scroll vertical, arrastres diagonales, cortos o lentos', () => {
  for (const update of [{ endX: 190, endY: 100 }, { endX: 90, endY: 200 }, { endX: 150 }, { elapsed: 900 }]) assert.equal(swipeTargetIndex(1, 5, { ...sample, ...update }), null);
});
test('respeta los extremos y las vistas que no están en el menú', () => {
  assert.equal(swipeTargetIndex(0, 5, { ...sample, endX: 310 }), null);
  assert.equal(swipeTargetIndex(4, 5, sample), null);
  assert.equal(swipeTargetIndex(-1, 5, sample), null);
});
