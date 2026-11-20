import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACKUP_VERSION, createBackup, inspectBackup, normalizePersistedState, parseBackup, type PersistedState } from '../../src/utils/backup';

const state: PersistedState = {
  schedule: { frequency: 'biweekly', anchorDate: '2026-01-02' },
  paydays: [{ id: 'pay_1', date: '2026-01-02', estimatedAmount: 1450.55 }],
  bills: [{ id: 'bill_1', name: 'Rent', amount: 950, dueDate: 1, category: 'Housing', type: 'fixed', isActive: true }],
  extraExpenses: [{ id: 'exp_1', description: 'Groceries', amount: 80.25, paydayDate: '2026-01-02' }],
  extraIncomes: [{ id: 'inc_1', amount: 100, source: 'Refund', dateAdded: '2026-01-01', paydayDate: '2026-01-02' }],
  variableOverrides: { 'bill_1::2026-01-02': 12.345 },
  variableFullTotalOverrides: {},
  paidStatuses: { 'bill_1::2026-01-02': true },
  excludedOccurrences: { 'bill_1_2026-01-02': true },
  lastSaved: '2026-01-01T00:00:00.000Z',
};

test('backup round trip preserves excluded occurrences and monetary values', () => {
  const json = createBackup(state);
  assert.equal(json.version, BACKUP_VERSION);
  const result = parseBackup(JSON.stringify(json));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.state.excludedOccurrences, state.excludedOccurrences);
  assert.deepEqual(result.state.paydays, state.paydays);
  assert.deepEqual(result.state.bills, state.bills);
  assert.equal(result.state.variableOverrides['bill_1::2026-01-02'], 12.35);
});

test('legacy backup keys are accepted without data loss', () => {
  const result = parseBackup(JSON.stringify({
    version: '1.0',
    bills: [],
    paychecks: [{ id: 'old_1', date: '2025-12-31', amount: 1000 }],
    expenses: [{ id: 'old_2', description: 'Coffee', amount: 5, paydayDate: '2025-12-31' }],
    extraCash: [{ id: 'old_3', amount: 20, source: 'Gift', dateAdded: '2025-12-31', paydayDate: '2025-12-31' }],
  }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.state.paydays[0]?.estimatedAmount, 1000);
  assert.equal(result.state.extraExpenses[0]?.description, 'Coffee');
  assert.equal(result.state.extraIncomes[0]?.source, 'Gift');
});

test('malformed and unsupported backups are rejected with an error', () => {
  const malformed = parseBackup('{not json');
  assert.equal(malformed.ok, false);
  const wrongVersion = parseBackup(JSON.stringify({ version: '9.9', bills: [] }));
  assert.equal(wrongVersion.ok, false);
  const empty = parseBackup(JSON.stringify({ version: '1.0' }));
  assert.equal(empty.ok, false);
});

test('import validation clamps invalid amounts and drops unsafe map keys', () => {
  const normalized = normalizePersistedState({
    bills: [{ id: 'bill_1', name: '<img src=x>', amount: -50, dueDate: 99, category: 'Other', type: 'unknown' }],
    variableOverrides: { '__proto__': 5, 'safe_key': Number.NaN },
    excludedOccurrences: { 'bill_1_date': 'yes', 'bill_2_date': true },
  });
  assert.equal(normalized.bills[0]?.amount, 0);
  assert.equal(normalized.bills[0]?.dueDate, 31);
  assert.equal(normalized.bills[0]?.name, '<img src=x>');
  assert.equal(normalized.bills[0]?.type, 'fixed');
  assert.equal(Object.prototype.hasOwnProperty.call(normalized.variableOverrides, '__proto__'), false);
  assert.equal('safe_key' in normalized.variableOverrides, false);
  assert.deepEqual({ ...normalized.excludedOccurrences }, { bill_2_date: true });
});

test('oversized backups are limited to supported record counts', () => {
  const bills = Array.from({ length: 700 }, (_, i) => ({ id: `bill_${i}`, name: 'B', amount: 1 }));
  const result = parseBackup(JSON.stringify({ version: '1.0', bills }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.state.bills.length, 500);
  assert.ok(result.warnings.some(w => w.includes('Only the first 500 bills')));
});

test('clean backups parse with no validation warnings', () => {
  const result = parseBackup(JSON.stringify(createBackup(state)));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.warnings, []);
});

test('inspectBackup reports record counts, warnings and excluded occurrences for the preview', () => {
  const payload = {
    version: '1.0',
    bills: [{ id: 'bill_1', name: 'Rent', amount: 950, dueDate: 1, category: 'Housing', type: 'fixed', isActive: true }],
    paydays: [{ id: 'pay_1', date: '2026-01-02', estimatedAmount: -5 }],
    excludedOccurrences: { 'bill_1_2026-01-02': true },
  };
  const first = inspectBackup(JSON.stringify(payload));
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.summary.bills, 1);
  assert.equal(first.summary.paydays, 1);
  assert.equal(first.summary.expenses, 0);
  assert.equal(first.summary.incomes, 0);
  assert.equal(first.summary.excludedOccurrences, 1);
  assert.ok(first.summary.warnings.length > 0, 'an invalid amount must produce a validation warning');
  assert.deepEqual(first.state.excludedOccurrences, { 'bill_1_2026-01-02': true });
  assert.equal(first.state.paydays[0]?.estimatedAmount, 0);
  // Inspection is pure: repeated calls are stable and do not mutate the payload.
  const second = inspectBackup(JSON.stringify(payload));
  assert.deepEqual(second, first);
});

test('inspectBackup rejects corrupt or unsupported backups without producing state', () => {
  const corrupt = inspectBackup('{not json');
  assert.equal(corrupt.ok, false);
  if (corrupt.ok) return;
  assert.ok(corrupt.error.length > 0);

  const wrongVersion = inspectBackup(JSON.stringify({ version: '9.9', bills: [] }));
  assert.equal(wrongVersion.ok, false);
  if (wrongVersion.ok) return;
  assert.match(wrongVersion.error, /version/i);
});

test('import round trip preserves excluded occurrences through preview and parse', () => {
  const json = JSON.stringify(createBackup(state));
  const inspection = inspectBackup(json);
  assert.equal(inspection.ok, true);
  if (!inspection.ok) return;
  assert.deepEqual(inspection.state.excludedOccurrences, state.excludedOccurrences);
  assert.equal(inspection.summary.excludedOccurrences, 1);
  // Applying the exact previewed state reproduces the original ledger.
  const reparsed = parseBackup(json);
  assert.equal(reparsed.ok, true);
  if (!reparsed.ok) return;
  assert.deepEqual(inspection.state, reparsed.state);
});
