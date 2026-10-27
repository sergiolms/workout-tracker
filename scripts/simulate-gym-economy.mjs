import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const config = JSON.parse(
  await readFile(
    new URL('../lib/gym/economy.json', import.meta.url),
    'utf8',
  ),
);
const items = new Map(config.items.map((item) => [item.id, item]));
const sum = (values) => values.reduce((total, value) => total + value, 0);
const clamp = (value, max = 1) => Math.max(0, Math.min(max, value));

// Inputs are normalized, deduplicated source contributions for a day, not raw clicks.
function dayUnits({ strength = 0, minutes = 0, movements = 0 } = {}) {
  return clamp(
    clamp(strength) +
      Math.max(0, minutes) / config.activityMinutesForFullDay +
      Math.max(0, movements) / config.mobilityMovementsForFullDay,
  );
}
function weekResult(days) {
  assert.equal(days.length, 7);
  let qualified = 0,
    total = 0,
    bonusGranted = false;
  const daily = days.map((day) => {
    const units = dayUnits(day);
    if (units >= config.qualifyingDayUnits) qualified++;
    const base = Math.floor(units * config.dailyCredits + 1e-9);
    const bonus = !bonusGranted && qualified >= 1 ? config.weeklyBonus : 0;
    if (bonus) bonusGranted = true;
    const granted = Math.min(config.weeklyCap - total, base + bonus);
    total += granted;
    return granted;
  });
  return { daily, total, qualified };
}
const schedule = (days, value) =>
  Array.from({ length: 7 }, (_, day) =>
    days.includes(day) ? { ...value } : {},
  );
const patterns = [
  {
    id: 'strength-1',
    name: 'Fuerza 1 día',
    days: schedule([2], { strength: 1 }),
  },
  {
    id: 'strength-2',
    name: 'Fuerza 2 días',
    days: schedule([1, 4], { strength: 1 }),
  },
  {
    id: 'strength-3',
    name: 'Fuerza 3 días',
    days: schedule([0, 2, 4], { strength: 1 }),
  },
  {
    id: 'strength-4',
    name: 'Fuerza 4 días',
    days: schedule([0, 1, 3, 5], { strength: 1 }),
  },
  {
    id: 'walking-3',
    name: 'Actividad 20 min, 3 días',
    days: schedule([0, 2, 4], { minutes: 20 }),
  },
  {
    id: 'walking-7',
    name: 'Actividad 20 min, 7 días',
    days: schedule([0, 1, 2, 3, 4, 5, 6], { minutes: 20 }),
  },
  {
    id: 'mobility-3',
    name: 'Movilidad 4 movimientos, 3 días',
    days: schedule([0, 2, 4], { movements: 4 }),
  },
  {
    id: 'mixed-3',
    name: 'Mixto 3 días: media sesión y 10 min',
    days: schedule([0, 2, 4], { strength: 0.5, minutes: 10 }),
  },
  {
    id: 'short-2',
    name: 'Actividad 10 min, 2 días',
    days: schedule([1, 4], { minutes: 10 }),
  },
  {
    id: 'all-7',
    name: 'Tres modalidades cada día, 7 días',
    days: schedule([0, 1, 2, 3, 4, 5, 6], {
      strength: 1,
      minutes: 120,
      movements: 20,
    }),
  },
];
const wishlist = [
  'plant',
  'mirror',
  'bench',
  'wood-floor',
  'rack',
  'expansion-1',
  'dumbbell-rack',
  'cable',
  'expansion-2',
  'poster',
  'lighting',
  'bike',
  'second-room',
];
function simulate(
  pattern,
  weeks,
  priorities = wishlist,
  pausedWeeks = new Set(),
) {
  let balance = config.startingCredits,
    earned = 0,
    next = 0;
  const purchases = [];
  for (let week = 1; week <= weeks; week++) {
    const days = pausedWeeks.has(week)
      ? Array.from({ length: 7 }, () => ({}))
      : pattern.days;
    const result = weekResult(days);
    for (let day = 0; day < 7; day++) {
      balance += result.daily[day];
      earned += result.daily[day];
      while (
        next < priorities.length &&
        balance >= items.get(priorities[next]).price
      ) {
        const item = items.get(priorities[next++]);
        balance -= item.price;
        purchases.push({
          id: item.id,
          name: item.name,
          week,
          day: day + 1,
          price: item.price,
        });
      }
    }
  }
  assert.equal(
    balance,
    config.startingCredits +
      earned -
      sum(purchases.map((purchase) => purchase.price)),
  );
  assert.ok(balance >= 0);
  return { balance, earned, purchases };
}
function verify() {
  const base = patterns.find((pattern) => pattern.id === 'strength-3');
  for (const id of ['walking-3', 'mobility-3', 'mixed-3'])
    assert.equal(
      weekResult(patterns.find((pattern) => pattern.id === id).days).total,
      weekResult(base.days).total,
    );
  assert.equal(
    weekResult(patterns.find((pattern) => pattern.id === 'all-7').days).total,
    150,
  );
  assert.equal(
    weekResult(patterns.find((pattern) => pattern.id === 'strength-4').days)
      .total,
    150,
  );
  assert.equal(weekResult(Array.from({ length: 7 }, () => ({}))).total, 0);
  assert.equal(dayUnits({ strength: 0.5, minutes: 10 }), 1);
  assert.equal(weekResult(schedule([0], { minutes: 10 })).total, 45);
  assert.equal(
    weekResult(schedule([0, 1, 2, 3, 4, 5, 6], { minutes: 1 })).total,
    7,
  );
  assert.equal(weekResult(schedule([6], { strength: 1 })).total, 60);
  assert.equal(weekResult(base.days).total, 120);
  assert.equal(dayUnits({ strength: 100, minutes: 2000, movements: 1000 }), 1);
  assert.equal(dayUnits({ strength: -1, minutes: -3, movements: -1 }), 0);
  for (let mask = 0; mask < 128; mask++) {
    const days = Array.from({ length: 7 }, (_, day) =>
      mask & (1 << day) ? { strength: 1 } : {},
    );
    const week = weekResult(days);
    assert.ok(week.total >= 0 && week.total <= config.weeklyCap);
    assert.equal(sum(week.daily), week.total);
    for (let changed = 0; changed < 7; changed++) {
      const increased = days.map((day, index) =>
        index === changed ? { ...day, minutes: 20 } : day,
      );
      assert.ok(weekResult(increased).total >= week.total);
    }
  }
  // Weekly receipts grant positive deltas only; repeat/reduced entitlements do not mint money.
  let granted = 0,
    minted = 0;
  for (const entitlement of [
    15, 30, 30, 15, 0, 30, 60, 60, 120, 90, 120, 150, 150,
  ]) {
    const delta = Math.max(0, entitlement - granted);
    minted += delta;
    granted += delta;
  }
  assert.equal(minted, config.weeklyCap);
  // Returning an object refunds its recorded purchase price once, regardless of current price.
  let balance = 1000;
  const returned = new Set();
  for (let cycle = 0; cycle < 100; cycle++) {
    const purchase = { id: String(cycle), paid: items.get('bench').price };
    balance -= purchase.paid;
    for (let retry = 0; retry < 3; retry++)
      if (!returned.has(purchase.id)) {
        returned.add(purchase.id);
        balance += purchase.paid;
      }
    assert.equal(balance, 1000);
  }
  const complete = simulate(base, 52);
  const paused = simulate(base, 56, wishlist, new Set([5, 6, 20, 21]));
  assert.equal(paused.earned, complete.earned);
  assert.deepEqual(
    paused.purchases.map((purchase) => purchase.id),
    complete.purchases.map((purchase) => purchase.id),
  );
  assert.equal(
    config.items.length,
    new Set(config.items.map((item) => item.id)).size,
  );
  assert.ok(
    config.items.every(
      (item) => Number.isInteger(item.price) && item.price > 0,
    ),
  );
  return {
    weeklySchedulesChecked: 128,
    monotonicComparisons: 896,
    refundCycles: 100,
    note: 'Mathematical model only. No Firebase, UI or transactional implementation is exercised.',
  };
}

const verification = verify();
const lines = [
  '# Simulación de la economía del gimnasio',
  '',
  'Generado desde `lib/gym/economy.json` con `node scripts/simulate-gym-economy.mjs`. Propuesta, no economía implementada ni validada con usuarios.',
  '',
  'Cada patrón repite el mismo calendario durante semanas de siete días. El primer día que llega a media contribución recibe el bonus semanal de 30 créditos, una sola vez. No depende del objetivo personal configurado. No se simulan compras con dinero real ni puntuación de capacidad física.',
  '',
  '## Ingresos y ahorro sin otras compras',
  '',
  '| Patrón | Créditos/semana | Ingreso en 52 semanas | Banco (150) | Ampliación (400) | Sala (1.800) |',
  '| --- | ---: | ---: | ---: | ---: | ---: |',
];
for (const pattern of patterns) {
  const weekly = weekResult(pattern.days).total;
  lines.push(
    `| ${pattern.name} | ${weekly} | ${weekly * 52} | ${Math.ceil(150 / weekly)} sem. | ${Math.ceil(400 / weekly)} sem. | ${Math.ceil(1800 / weekly)} sem. |`,
  );
}
lines.push(
  '',
  'Los plazos anteriores son ahorro exclusivo para ese artículo. No representan un gimnasio decorado que además compra otros objetos.',
  '',
  '## Compra progresiva',
  '',
  'Prioridad fija: planta → espejo → banco → suelo de madera → rack → primera ampliación → mancuernero → poleas → segunda ampliación → lámina → iluminación → bicicleta → segunda sala. Se compra en cuanto alcanza el saldo. No se revende nada.',
  '',
  '| Objeto | 1 día completo/semana | 2 días completos/semana | 3 días completos/semana | 4 días completos/semana |',
  '| --- | ---: | ---: | ---: | ---: |',
);
const purchaseRuns = [
  'strength-1',
  'strength-2',
  'strength-3',
  'strength-4',
].map((id) =>
  simulate(
    patterns.find((pattern) => pattern.id === id),
    104,
  ),
);
for (const id of wishlist)
  lines.push(
    `| ${items.get(id).name} | ${purchaseRuns
      .map((run) => {
        const purchase = run.purchases.find((item) => item.id === id);
        return purchase ? `Sem. ${purchase.week}` : '>104 sem.';
      })
      .join(' | ')} |`,
  );
const totalCatalogue = sum(config.items.map((item) => item.price));
lines.push(
  '',
  '## Horizonte del catálogo',
  '',
  `Los ${config.items.length} artículos y ampliaciones cuestan ${totalCatalogue} créditos en total. Con 120 créditos semanales, comprar una unidad de todo exige al menos ${Math.ceil(totalCatalogue / 120)} semanas de ingresos; con el máximo de 150, ${Math.ceil(totalCatalogue / 150)}. No incluye objetos iniciales gratuitos ni piezas concedidas por logros. Comprar solo lo que se desea reduce ese plazo.`,
  '',
  'El catálogo fijo se termina. La economía no soluciona por sí sola la retención a varios años: hacen falta libertad de diseño y nuevas piezas, sin inflar los precios de lo que ya existe.',
  '',
  '## Verificación matemática',
  '',
  `Se comprobaron ${verification.weeklySchedulesChecked} calendarios semanales, ${verification.monotonicComparisons} aumentos de actividad, ${verification.refundCycles} ciclos de compra/devolución, igualdad entre modalidades con la misma contribución, límites, pausas y repetición de concesiones.`,
  '',
  'Estas comprobaciones no prueban deduplicación de registros reales, transacciones concurrentes, cambios de fecha entre semanas, incorporación local/nube ni resistencia a manipulación del cliente. Las pruebas del motor y de persistencia se describen en [la implementación](../virtual-gym-implementation.md).',
  '',
);
await writeFile(
  new URL('../docs/economy/simulation.md', import.meta.url),
  lines.join('\n'),
);
console.log(
  JSON.stringify(
    {
      config: config.version,
      verification,
      catalogueCost: totalCatalogue,
      weeklyIncomes: patterns.map((pattern) => ({
        pattern: pattern.name,
        credits: weekResult(pattern.days).total,
      })),
    },
    null,
    2,
  ),
);
