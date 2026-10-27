import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gymRotations,
  rotatePlacement,
  placementRotation,
  placementSize,
  furniturePoint,
} from './gym/orientation.ts';
import { draggedPlacement } from './gym/drag.ts';
import {
  createGym,
  applyGymCommand,
  placementError,
  validateGymImport,
} from './gym/engine.ts';
import { defaultState } from './storage.ts';
import { orderFurnitureSurfaces } from './gym/depth-order.ts';

test('legacy positions retain their orientation, and four turns return to the same footprint', () => {
  for (const rotated of [false, true]) {
    const original = { room: 'main', x: 2, y: 3, rotated };
    assert.equal(placementRotation(original), rotated ? 90 : 0);
    let current = original;
    const seen = new Set();
    for (let turn = 0; turn < 4; turn++) {
      seen.add(placementRotation(current));
      current = rotatePlacement(current);
      assert.equal(current.rotated, current.rotation % 180 !== 0);
    }
    assert.equal(seen.size, 4);
    assert.equal(placementRotation(current), placementRotation(original));
    assert.equal(current.x, original.x);
    assert.equal(current.y, original.y);
  }
});

test('all four directions transform the same asymmetric piece within its occupied cells', () => {
  const item = { width: 3, depth: 2 };
  const expected = [
    [0.4, 0.7],
    [1.3, 0.4],
    [2.6, 1.3],
    [0.7, 2.6],
  ];
  for (const [index, rotation] of gymRotations.entries()) {
    const place = {
      room: 'main',
      x: 4,
      y: 5,
      rotation,
      rotated: rotation % 180 !== 0,
    };
    const [x, y] = furniturePoint(item, place, [0.4, 0.7]);
    assert.ok(Math.abs(x - 4 - expected[index][0]) < 1e-9);
    assert.ok(Math.abs(y - 5 - expected[index][1]) < 1e-9);
    const size = placementSize(item, place);
    assert.equal(size.width, index % 2 ? 2 : 3);
    assert.equal(size.depth, index % 2 ? 3 : 2);
    assert.ok(x >= place.x && x <= place.x + size.width);
    assert.ok(y >= place.y && y <= place.y + size.depth);
    const dragged = draggedPlacement(
      place,
      10000,
      10000,
      10,
      item.width,
      item.depth,
    );
    assert.equal(dragged.rotation, rotation);
    assert.ok(dragged.x + size.width <= 10 && dragged.y + size.depth <= 10);
  }
});

test('four-direction placements survive save/import and still enforce bounds, occupancy and valid angles', () => {
  const now = '2026-10-27T12:00:00Z';
  let state = { ...defaultState, gym: createGym(defaultState, 'UTC', now) };
  for (let i = 1; i <= 10; i++) {
    const day = `2026-10-${String(i).padStart(2, '0')}`;
    state.gym.receipts[day] = { kind: 'activity', day, units: 1, count: 20 };
  }
  state = applyGymCommand(
    state,
    { type: 'buy', id: 'bench-owned', itemId: 'bench' },
    now,
  );
  for (const rotation of gymRotations) {
    const placement = {
      room: 'main',
      x: 4,
      y: 4,
      rotation,
      rotated: rotation % 180 !== 0,
    };
    state = applyGymCommand(
      state,
      { type: 'place', id: 'bench-owned', placement },
      now,
    );
    const restored = validateGymImport(JSON.parse(JSON.stringify(state.gym)));
    assert.equal(restored.placements['bench-owned'].rotation, rotation);
    assert.match(
      placementError(state.gym, 'bench-owned', { ...placement, x: 6 }),
      /fuera/,
    );
    assert.match(
      placementError(state.gym, 'bench-owned', { ...placement, x: 1, y: 1 }),
      /ocupado/,
    );
  }
  assert.match(
    placementError(state.gym, 'bench-owned', {
      room: 'main',
      x: 0,
      y: 0,
      rotated: false,
      rotation: 45,
    }),
    /incorrecta/,
  );
  assert.match(
    placementError(state.gym, 'bench-owned', {
      room: 'main',
      x: 0,
      y: 0,
      rotated: false,
      rotation: 90,
    }),
    /incorrecta/,
  );
});

test('overlapping surfaces draw back-to-front independently of their construction order', () => {
  const project = ([x, y, z]) => [(x - y) * 36, (x + y) * 18 - z * 30];
  const near = [
    [1, 1, 1.2],
    [2, 1, 1.2],
    [2, 2, 1.2],
    [1, 2, 1.2],
  ];
  const far = near.map(([x, y, z]) => [x - 1, y - 1, z - 1.2]);
  const surface = (world, value) => ({
    world,
    screen: world.map(project),
    value,
  });
  const a = surface(near, 'near'),
    b = surface(far, 'far');
  assert.deepEqual(orderFurnitureSurfaces([a, b]), ['far', 'near']);
  assert.deepEqual(orderFurnitureSurfaces([b, a]), ['far', 'near']);
});
