import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const port = 3934;
const base = `http://127.0.0.1:${port}`;

if (!existsSync(path.join(repo, 'dist', 'index.html'))) {
  throw new Error('Build the app first: npm run build');
}

const server = spawn(process.execPath, [path.join(repo, 'build', 'server.cjs')], {
  cwd: repo,
  env: { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += String(chunk); });
server.stderr.on('data', chunk => { serverOutput += String(chunk); });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser;

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    await sleep(250);
    try {
      if ((await fetch(`${base}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {
      // Waiting for the server.
    }
  }
  assert.ok(ready, `Production server did not start: ${serverOutput}`);

  browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  // Start from an explicitly empty ledger; a missing key would seed demo data.
  await page.addInitScript(() => {
    localStorage.setItem('midnightledger_v1', JSON.stringify({
      isWiped: true,
      schedule: { frequency: 'manual', anchorDate: '' },
      paydays: [], bills: [], extraExpenses: [], extraIncomes: [],
      variableOverrides: {}, variableFullTotalOverrides: {},
      paidStatuses: {}, excludedOccurrences: {},
    }));
  });
  await page.goto(base, { waitUntil: 'networkidle' });

  const stored = () => page.evaluate(() => localStorage.getItem('midnightledger_v1'));
  const ledger = async () => JSON.parse((await stored()) || '{}');
  const go = async tab => page.locator(`#mobile-tab-${tab}`).click();

  // --- Bills: create with an explicit custom split, edit, then delete ---
  await go('bills');
  await page.getByRole('button', { name: 'Add New Bill' }).click();
  let dialog = page.getByRole('dialog', { name: 'Bill editor' });
  await dialog.getByLabel('Bill name').fill('E2E Split Bill');
  await dialog.getByLabel('Monthly bill amount').fill('100');
  await dialog.getByLabel('Due date').fill('25');
  await dialog.locator('input[aria-label="Split this bill"]').check({ force: true });
  await dialog.getByLabel('Full bill total').fill('100');
  await dialog.getByLabel('Split method').selectOption('custom');
  await dialog.getByLabel('My custom share').fill('25');
  await dialog.getByRole('button', { name: 'Create Bill' }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByText('E2E Split Bill').waitFor();
  assert.ok(await page.getByText('E2E Split Bill').count() > 0, 'bill created');

  let data = await ledger();
  let savedBill = data.bills.find(bill => bill.name === 'E2E Split Bill');
  assert.ok(savedBill, 'bill persisted');
  assert.equal(savedBill.splitType, 'custom', 'split type persisted');
  assert.equal(savedBill.customMyShare, 25, 'custom share persisted');

  await page.getByRole('button', { name: 'Edit bill' }).first().click();
  dialog = page.getByRole('dialog', { name: 'Bill editor' });
  assert.equal(await dialog.getByLabel('Bill name').inputValue(), 'E2E Split Bill');
  assert.equal(await dialog.getByLabel('Split method').inputValue(), 'custom', 'editor keeps split type');
  assert.equal(await dialog.getByLabel('My custom share').inputValue(), '25', 'editor keeps custom share');
  await dialog.getByLabel('Bill name').fill('E2E Split Bill Edited');
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByText('E2E Split Bill Edited').waitFor();
  assert.ok(await page.getByText('E2E Split Bill Edited').count() > 0, 'bill edited');

  await page.getByRole('button', { name: 'Delete bill' }).first().click();
  const deleteBill = page.getByRole('dialog', { name: 'Delete bill' });
  assert.ok(await deleteBill.getByText('E2E Split Bill Edited').count() > 0);
  await deleteBill.getByText('Delete All Future Months').click();
  assert.equal(await page.getByText('E2E Split Bill Edited').count(), 0, 'bill deleted');

  // --- Paydays: add a custom date, then change the recurring rule ---
  await go('paydays');
  await page.getByRole('button', { name: 'Add Custom Date' }).click();
  const payday = page.getByRole('dialog', { name: 'Payday estimate' });
  await payday.getByLabel('Payday date').fill('2026-12-15');
  await payday.getByLabel('Payday amount').fill('1200');
  await payday.getByRole('button', { name: 'Save Payday' }).click();
  await payday.waitFor({ state: 'detached' });
  data = await ledger();
  assert.ok(
    data.paydays.some(item => item.date === '2026-12-15' && item.estimatedAmount === 1200),
    'custom payday persisted',
  );

  await page.getByRole('button', { name: 'Change Rule' }).click();
  const schedule = page.getByRole('dialog', { name: 'Pay schedule' });
  await schedule.getByText('Twice a Month').click();
  await schedule.getByRole('button', { name: 'Apply Schedule' }).click();
  await schedule.waitFor({ state: 'detached' });
  data = await ledger();
  assert.equal(data.schedule.frequency, 'twice_monthly', 'pay schedule persisted');

  // --- Expenses: create, search and delete ---
  await go('expenses');
  await page.getByRole('button', { name: 'Add Expense', exact: true }).first().click();
  const expense = page.getByRole('dialog', { name: 'Expense editor' });
  await expense.getByLabel('Expense description').fill('E2E Coffee');
  await expense.getByLabel('Expense amount').fill('4.25');
  await expense.getByRole('button', { name: 'Save Expense' }).click();
  await expense.waitFor({ state: 'detached' });
  assert.ok(await page.getByText('E2E Coffee').count() > 0, 'expense created');

  await page.getByLabel('Search expenses').fill('no-such-merchant');
  assert.equal(await page.getByText('Running Expenses (0)').count(), 1, 'expense search filters');
  await page.getByLabel('Search expenses').fill('');
  assert.equal(await page.getByText('Running Expenses (1)').count(), 1, 'expense search clears');

  await page.getByRole('button', { name: 'Delete expense' }).first().click();
  const deleteExpense = page.getByRole('dialog', { name: 'Delete expense' });
  await deleteExpense.getByText('Delete This Expense').click();
  assert.equal(await page.getByText('E2E Coffee').count(), 0, 'expense deleted');

  // --- Extra income from the dashboard payday card ---
  await go('dashboard');
  await page.getByRole('button', { name: 'Add Extra Cash' }).first().click();
  const income = page.getByRole('dialog', { name: 'Add extra income' });
  await income.getByLabel('Income amount').fill('50');
  await income.getByLabel('Income source').fill('E2E refund');
  await income.getByRole('button', { name: /Add .* to Period|Add Extra Cash/ }).click();
  await income.waitFor({ state: 'detached' });
  data = await ledger();
  assert.ok(data.extraIncomes.some(item => item.source === 'E2E refund' && item.amount === 50), 'extra income persisted');

  // --- Settings: accent colour, reminder toggle and lead days ---
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Appearance settings' });
  await settings.getByRole('button', { name: /accent colour$/ }).first().click();
  const reminders = settings.getByRole('switch', { name: 'Bill reminders' });
  const before = await reminders.getAttribute('aria-checked');
  await reminders.click();
  assert.notEqual(await reminders.getAttribute('aria-checked'), before, 'bill reminders toggle works');
  await settings.getByRole('button', { name: '7d' }).click();
  await settings.getByRole('button', { name: 'Close settings' }).click();
  const notifSettings = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('midnightledger_notification_settings') || '{}'));
  assert.equal(notifSettings.daysAhead, 7, 'reminder lead days persisted');
  assert.ok(await page.evaluate(() => localStorage.getItem('midnightledger_accent_color')), 'accent colour persisted');

  // --- History: export and filter ---
  await go('history');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click(),
  ]);
  assert.match(download.suggestedFilename(), /^midnight_ledger_backup_\d{4}-\d{2}-\d{2}\.json$/);
  const exported = readFileSync(await download.path(), 'utf8');
  assert.ok(exported.includes('E2E refund'), 'export includes extra income');
  await page.getByRole('button', { name: 'By Month' }).click();
  await page.getByRole('button', { name: 'All Time' }).click();

  // --- Factory reset is explicit and destructive ---
  await page.getByRole('button', { name: 'Factory Reset / Wipe All Data' }).click();
  const wipe = page.getByRole('dialog', { name: 'Confirm data wipe' });
  const confirm = wipe.getByRole('button', { name: 'Confirm Factory Reset' });
  assert.equal(await confirm.isDisabled(), true, 'wipe stays disabled until confirmed');
  await wipe.getByLabel('Type WIPE to confirm').fill('WIPE');
  await confirm.click();
  await wipe.waitFor({ state: 'detached' });
  data = await ledger();
  assert.equal(data.bills.length, 0, 'factory reset clears bills');
  assert.equal(data.extraIncomes.length, 0, 'factory reset clears extra income');

  assert.deepEqual(pageErrors, [], 'no uncaught page errors');
  console.log('Feature E2E passed: bill split create/edit/delete, custom payday, schedule rule, expense create/search/delete, extra income, settings, history export/filter, factory reset.');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
