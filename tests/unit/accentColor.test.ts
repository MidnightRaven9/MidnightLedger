import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getContrastText } from '../../src/utils/accentColor';

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function ratio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test('getContrastText always selects the higher-contrast text colour', () => {
  const accents = ['#a855f7', '#22c55e', '#06b6d4', '#f97316', '#3b82f6', '#f43f5e', '#ffffff', '#000000'];
  for (const accent of accents) {
    const chosen = getContrastText(accent);
    const dark = ratio(accent, '#0B0B0D');
    const light = ratio(accent, '#FFFFFF');
    const expected = dark >= light ? '#0B0B0D' : '#FFFFFF';
    assert.equal(chosen, expected, `accent ${accent}`);
    assert.ok(Math.max(dark, light) >= 4.5, `accent ${accent} must offer at least 4.5:1 with one text option`);
  }
});

test('getContrastText chooses dark text on light accents and light text on dark accents', () => {
  assert.equal(getContrastText('#ffffff'), '#0B0B0D');
  assert.equal(getContrastText('#000000'), '#FFFFFF');
});
