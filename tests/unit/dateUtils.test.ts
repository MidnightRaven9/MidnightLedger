import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, getDaysInMonth, isValidISODateString, parseISODate, toISODateString } from '../../src/utils/dateUtils';

test('ISO date validation accepts leap days and rejects impossible dates', () => {
  assert.equal(isValidISODateString('2024-02-29'), true);
  assert.equal(isValidISODateString('2023-02-29'), false);
  assert.equal(isValidISODateString('2026-13-01'), false);
  assert.equal(isValidISODateString('2026-01-32'), false);
  assert.equal(isValidISODateString('2026-1-1'), false);
});

test('addDays crosses month, year and leap-day boundaries', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-02-29', 1), '2024-03-01');
  assert.equal(addDays('2025-12-31', 1), '2026-01-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});

test('getDaysInMonth handles leap years', () => {
  assert.equal(getDaysInMonth(2024, 1), 29);
  assert.equal(getDaysInMonth(2025, 1), 28);
  assert.equal(getDaysInMonth(2026, 11), 31);
});

test('date parsing and formatting round trip at local noon', () => {
  for (const iso of ['2026-01-01', '2026-06-15', '2026-12-31']) {
    const parsed = parseISODate(iso);
    assert.equal(parsed.getHours(), 12);
    assert.equal(toISODateString(parsed), iso);
  }
  assert.ok(Number.isNaN(parseISODate('not-a-date').getTime()));
});
