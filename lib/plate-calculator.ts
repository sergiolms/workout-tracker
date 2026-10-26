export type PlateStock = { weight: number; pairs: number };
export type PlateResult = {
  plates: PlateStock[];
  total: number;
  remaining: number;
};

export function calculatePlates(
  target: number,
  bar: number,
  stock: PlateStock[],
): PlateResult | null {
  if (
    !Number.isFinite(target) ||
    !Number.isFinite(bar) ||
    bar < 0 ||
    bar > 100 ||
    target < bar ||
    target > 1000
  )
    return null;
  const capacity = Math.floor(((target - bar) / 2) * 4 + 1e-8);
  const plates = stock
    .filter(
      ({ weight, pairs }) =>
        Number.isFinite(weight) &&
        weight > 0 &&
        weight <= 50 &&
        Number.isInteger(weight * 4) &&
        Number.isInteger(pairs) &&
        pairs > 0 &&
        pairs <= 10,
    )
    .sort((a, b) => b.weight - a.weight);
  const solutions: Array<number[] | undefined> = Array(capacity + 1);
  solutions[0] = [];
  for (let index = 0; index < plates.length; index++) {
    const { weight, pairs } = plates[index];
    const units = weight * 4;
    for (let copy = 0; copy < pairs; copy++) {
      for (let amount = capacity; amount >= units; amount--) {
        const previous = solutions[amount - units];
        if (
          previous &&
          (!solutions[amount] ||
            previous.length + 1 < solutions[amount]!.length)
        )
          solutions[amount] = [...previous, index];
      }
    }
  }
  let achieved = capacity;
  while (!solutions[achieved]) achieved--;
  const selected = solutions[achieved]!;
  const total = bar + achieved / 2;
  return {
    plates: plates
      .map((plate, index) => ({
        weight: plate.weight,
        pairs: selected.filter((item) => item === index).length,
      }))
      .filter((plate) => plate.pairs > 0),
    total,
    remaining: Number((target - total).toFixed(4)),
  };
}
