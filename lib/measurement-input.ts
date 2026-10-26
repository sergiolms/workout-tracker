export function optionalMeasurement(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d+(?:[.,]\d+)?$/.test(trimmed)) return NaN;
  return Number(trimmed.replace(',', '.'));
}

export function validMeasurements(weight: string, waist: string): boolean {
  const values = [optionalMeasurement(weight), optionalMeasurement(waist)];
  return (
    values.some((value) => value !== undefined) &&
    values.every(
      (value) => value === undefined || (Number.isFinite(value) && value > 0),
    )
  );
}
