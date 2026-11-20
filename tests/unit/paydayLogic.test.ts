import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Bill, ExtraExpense, Payday, PaydaySchedule } from '../../src/types';
import { calculatePaydaySummaries, getPaydayForDate, getProjectedNextPaydayDate } from '../../src/utils/paydayLogic';
import { roundCents } from '../../src/utils/calculations';

const schedule: PaydaySchedule = { frequency: 'weekly', anchorDate: '2026-01-02' };
const paydays: Payday[] = [
  { id: 'p1', date: '2026-01-02', estimatedAmount: 1000 },
  { id: 'p2', date: '2026-01-09', estimatedAmount: 1000 },
];
const bills: Bill[] = [
  { id: 'b1', name: 'Rent', amount: 500, myShare: 500, dueDate: 5, category: 'Housing', type: 'fixed', isActive: true },
  { id: 'b2', name: 'Split utility', amount: 50, fullTotal: 100, isSplit: true, splitCount: 3, dueDate: 7, category: 'Utilities', type: 'variable', isActive: true },
];
const expenses: ExtraExpense[] = [
  { id: 'e1', description: 'Groceries', amount: 25.125, paydayDate: '2026-01-02' },
];

test('payday summaries keep totals and leftovers internally consistent', () => {
  const summaries = calculatePaydaySummaries(paydays, bills, expenses, schedule, {}, {}, {}, {}, []);
  assert.equal(summaries.length, 2);
  for (const summary of summaries) {
    assert.equal(summary.totalOutflow, roundCents(summary.totalBills + summary.totalExtraExpenses));
    if (summary.leftOver !== null && summary.totalAvailable !== null) {
      assert.equal(summary.leftOver, roundCents(summary.totalAvailable - summary.totalOutflow));
    }
  }
  const first = summaries[0];
  assert.equal(first.totalExtraExpenses, 25.13);
  assert.equal(first.leftOver, roundCents(1000 - (first.totalBills + 25.13)));
});

test('excluded occurrences are omitted from assignments and totals', () => {
  const base = calculatePaydaySummaries(paydays, bills, [], schedule, {}, {}, {}, {}, []);
  const excluded = calculatePaydaySummaries(paydays, bills, [], schedule, {}, {}, {}, { 'b1_2026-01-05': true }, []);
  assert.ok(base.reduce((sum, s) => sum + s.totalBills, 0) > 0);
  const allAssigned = excluded.flatMap(s => s.assignedBills.map(item => item.bill.id));
  assert.equal(allAssigned.includes('b1'), false);
});

test('payday projection handles weekly, monthly and month-end boundaries', () => {
  assert.equal(getProjectedNextPaydayDate('2026-01-02', 'weekly'), '2026-01-09');
  assert.equal(getProjectedNextPaydayDate('2026-02-20', 'biweekly'), '2026-03-06');
  const monthly = getProjectedNextPaydayDate('2026-01-31', { frequency: 'monthly', anchorDate: '', monthlyDay: 31 });
  assert.equal(monthly, '2026-02-28');
});

test('getPaydayForDate picks the most recent payday at or before a transaction', () => {
  const summaries = calculatePaydaySummaries(paydays, [], [], schedule, {}, {}, {}, {}, []);
  assert.equal(getPaydayForDate('2026-01-05', summaries), '2026-01-02');
  assert.equal(getPaydayForDate('2025-12-30', summaries), '2026-01-02');
});
