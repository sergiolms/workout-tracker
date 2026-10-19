import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { mobilityGuides, resetMobilityKeys } from './mobility-guide.ts';
import { mobility } from './workout-data.ts';

test('cada movimiento de movilidad tiene una demostración e instrucciones', () => {
  for (const [name] of mobility) {
    const guide = mobilityGuides[name];
    assert.ok(guide, `Falta guía para ${name}`);
    assert.equal(guide.steps.length, 2);
    assert.ok(guide.steps.every((step) => step.length > 20));
    assert.ok(existsSync(new URL(`../public/mobility/${guide.id}.jpg`, import.meta.url)), `Falta foto para ${name}`);
  }
  assert.equal(Object.keys(mobilityGuides).length, mobility.length);
});

test('reiniciar una rutina conserva la otra y los días anteriores', () => {
  const done = ['2026-10-16:corta-A', '2026-10-16:corta-B', '2026-10-16:larga-C', '2026-10-15:corta-A'];
  assert.deepEqual(resetMobilityKeys(done, ['2026-10-16:corta-A', '2026-10-16:corta-B']), ['2026-10-16:larga-C', '2026-10-15:corta-A']);
});
