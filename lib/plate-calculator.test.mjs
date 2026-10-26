import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePlates } from './plate-calculator.ts';
import { duplicateSet } from './exercise-sets.ts';

test('discos simétricos incluyen la barra y respetan las unidades disponibles', () => {
  assert.deepEqual(
    calculatePlates(65, 20, [
      { weight: 20, pairs: 1 },
      { weight: 2.5, pairs: 1 },
    ]),
    {
      plates: [
        { weight: 20, pairs: 1 },
        { weight: 2.5, pairs: 1 },
      ],
      total: 65,
      remaining: 0,
    },
  );
  assert.deepEqual(calculatePlates(80, 20, [{ weight: 20, pairs: 1 }]), {
    plates: [{ weight: 20, pairs: 1 }],
    total: 60,
    remaining: 20,
  });
});
test('encuentra combinaciones que un algoritmo voraz perdería y soporta fracciones', () => {
  assert.equal(
    calculatePlates(12, 0, [
      { weight: 4, pairs: 1 },
      { weight: 3, pairs: 2 },
    ]).total,
    12,
  );
  assert.equal(
    calculatePlates(20.5, 20, [{ weight: 0.25, pairs: 1 }]).total,
    20.5,
  );
  assert.equal(calculatePlates(21, 20, []).total, 20);
  assert.equal(calculatePlates(10, 20, []), null);
  assert.equal(calculatePlates(NaN, 20, []), null);
  assert.equal(calculatePlates(2000, 20, []), null);
});
test('duplicar una serie conserva los valores planificados y descarta resultados e identidad de importación', () => {
  const original = {
    reps: 10,
    load: 40,
    seconds: 30,
    kind: 'warmup',
    done: true,
    rpe: 9,
    sourceType: 'dropset',
    supersetId: 'import-1',
  };
  const sets = [original, { reps: 8, done: false }];
  const next = duplicateSet(sets, 0);
  assert.deepEqual(next[1], {
    reps: 10,
    load: 40,
    seconds: 30,
    kind: 'warmup',
    done: false,
  });
  assert.equal(next[0], original);
  assert.equal(next[2], sets[1]);
  assert.equal(sets.length, 2);
  assert.equal(duplicateSet(sets, 99), sets);
});
test('el montaje coincide con todas las combinaciones posibles sin exceder el peso ni el inventario', () => {
  const stock = [
    { weight: 5, pairs: 2 },
    { weight: 3, pairs: 2 },
    { weight: 1.25, pairs: 1 },
  ];
  for (let target = 20; target <= 60; target += 0.5) {
    const combinations = [];
    for (let a = 0; a <= 2; a++)
      for (let b = 0; b <= 2; b++)
        for (let c = 0; c <= 1; c++) {
          const total = 20 + 2 * (5 * a + 3 * b + 1.25 * c);
          if (total <= target) combinations.push({ total, count: a + b + c });
        }
    combinations.sort((a, b) => b.total - a.total || a.count - b.count);
    const result = calculatePlates(target, 20, stock);
    assert.equal(result.total, combinations[0].total);
    assert.equal(
      result.plates.reduce((sum, plate) => sum + plate.pairs, 0),
      combinations[0].count,
    );
    for (const plate of result.plates)
      assert.ok(
        plate.pairs <= stock.find((item) => item.weight === plate.weight).pairs,
      );
  }
});
