import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(
  new URL('../app/globals.css', import.meta.url),
  'utf8',
);
const rgb = (hex) =>
  [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
const luminance = (color) =>
  color
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0,
    );
const contrast = (a, b) => {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
};
const mix = (a, b, opacity) =>
  a.map((value, index) => value * opacity + b[index] * (1 - opacity));

for (const [name, selector] of [
  ['claro', ':root'],
  ['oscuro', '.dark'],
]) {
  const block = css.slice(css.indexOf(`${selector} {`)).split('}')[0];
  const tokens = Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(([, key, hex]) => [
      key,
      rgb(hex),
    ]),
  );
  test(`contraste AA de los textos y estados en tema ${name}`, () => {
    for (const surface of ['background', 'card', 'popover', 'muted']) {
      for (const text of [
        'foreground',
        'muted-foreground',
        'primary',
        'destructive',
        'warning',
      ]) {
        const value = contrast(tokens[text], tokens[surface]);
        assert.ok(
          value >= 4.5,
          `${text} sobre ${surface}: ${value.toFixed(2)}:1`,
        );
      }
    }
    for (const [text, surface] of [
      ['primary-foreground', 'primary'],
      ['secondary-foreground', 'secondary'],
      ['accent-foreground', 'accent'],
      ['destructive-foreground', 'destructive'],
    ])
      assert.ok(
        contrast(tokens[text], tokens[surface]) >= 4.5,
        `${text} sobre ${surface}`,
      );
    assert.ok(
      contrast(
        tokens.destructive,
        mix(
          tokens.destructive,
          tokens.background,
          name === 'oscuro' ? 0.2 : 0.1,
        ),
      ) >= 4.5,
      'Botón destructivo',
    );
    assert.ok(
      contrast(tokens.primary, mix(tokens.primary, tokens.background, 0.1)) >=
        4.5,
      'Selección primaria',
    );
    for (const surface of ['background', 'card'])
      assert.ok(
        contrast(tokens.input, tokens[surface]) >= 3,
        `Borde de campo sobre ${surface}`,
      );
  });
}
