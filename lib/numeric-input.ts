// Accept either decimal separator without allowing partial or non-finite numbers.
export function parseNumericInput(text: string, integer = false): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!(integer ? /^\d+$/ : /^\d+(?:\.\d*)?$/).test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
