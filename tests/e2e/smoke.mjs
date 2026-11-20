import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const port = 3933;
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
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });

  assert.equal(await page.title(), 'MidnightLedger');
  assert.equal(await page.locator('html.dark').count(), 1);
  assert.ok(await page.getByText('MidnightLedger', { exact: true }).count() > 0);

  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Skip to content');

  await page.locator('#mobile-tab-bills').click();
  assert.ok(await page.getByText('Bills', { exact: true }).count() > 0);

  const addBill = page.getByRole('button', { name: 'Add New Bill' });
  await addBill.click();
  const dialog = page.getByRole('dialog', { name: 'Bill editor' });
  assert.equal(await dialog.count(), 1);
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  assert.equal(await addBill.evaluate(node => node === document.activeElement), true);

  await page.locator('#mobile-tab-dashboard').click();
  assert.ok((await page.locator('main').count()) > 0);

  // --- Functional QA: every screen at mobile and desktop widths ---
  const tabs = ['dashboard', 'bills', 'paydays', 'expenses', 'reports', 'history'];
  for (const tab of tabs) {
    await page.locator(`#mobile-tab-${tab}`).click();
    assert.ok((await page.locator('main').innerText()).length > 40, `${tab} (mobile) rendered content`);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const tab of tabs) {
    await page.locator(`#tab-${tab}`).click();
    assert.ok((await page.locator('main').innerText()).length > 40, `${tab} (desktop) rendered content`);
  }
  await page.setViewportSize({ width: 390, height: 844 });

  // --- Backup import preview: cancel, corrupt backup, confirmed round trip ---
  await page.locator('#mobile-tab-history').click();

  const validBackup = JSON.stringify({
    version: '1.0',
    schedule: { frequency: 'manual', anchorDate: '2026-01-02' },
    paydays: [{ id: 'e2e_pay', date: '2026-01-02', estimatedAmount: 1000 }],
    bills: [{ id: 'e2e_bill', name: 'IMPORTED E2E BILL', amount: 500, dueDate: 1, category: 'Housing', type: 'fixed', isActive: true }],
    extraExpenses: [],
    extraIncomes: [],
    variableOverrides: {},
    variableFullTotalOverrides: {},
    paidStatuses: {},
    excludedOccurrences: {},
  });
  const importInput = page.locator('input[type="file"][aria-label="Import budget backup JSON file"]').last();
  const preview = page.getByRole('dialog', { name: 'Review backup before importing' });

  // A valid backup opens a preview with record counts; cancelling changes nothing.
  await importInput.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(validBackup) });
  await preview.waitFor();
  assert.equal((await preview.locator('dd').first().textContent())?.trim(), '1');

  // "Download my current data first" exports the live ledger without applying
  // the import, and leaves the preview open.
  const [currentDownload] = await Promise.all([
    page.waitForEvent('download'),
    preview.getByRole('button', { name: 'Download my current data first' }).click(),
  ]);
  assert.match(currentDownload.suggestedFilename(), /^midnight_ledger_backup_\d{4}-\d{2}-\d{2}\.json$/);
  const currentPath = await currentDownload.path();
  assert.ok(currentPath);
  const currentData = readFileSync(currentPath, 'utf8');
  assert.ok(currentData.includes('"bills"'), 'export contains bills');
  assert.ok(currentData.includes('"excludedOccurrences"'), 'export contains skipped occurrences');
  assert.equal(await preview.count(), 1, 'export does not close or apply the preview');

  await preview.getByRole('button', { name: 'Cancel' }).click();
  assert.equal(await preview.count(), 0);
  assert.equal(await page.getByText('IMPORTED E2E BILL', { exact: true }).count(), 0);

  // A corrupt backup is rejected in the preview with replacement disabled.
  await importInput.setInputFiles({ name: 'corrupt.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
  await preview.waitFor();
  assert.ok(await preview.getByText('This backup could not be imported.').count() > 0);
  assert.equal(await preview.getByRole('button', { name: 'Replace my data' }).isDisabled(), true);
  await preview.getByRole('button', { name: 'Cancel' }).click();
  assert.equal(await preview.count(), 0);

  // Confirming a valid preview applies exactly the inspected state.
  await importInput.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(validBackup) });
  await preview.waitFor();
  await preview.getByRole('button', { name: 'Replace my data' }).click();
  await preview.waitFor({ state: 'detached' });
  assert.ok(await page.getByText('IMPORTED E2E BILL', { exact: true }).count() > 0);

  // --- CRITICAL data safety: a corrupted ledger must never be auto-overwritten ---
  // Seed an invalid persisted value before the app boots. The provider falls
  // back to an empty in-memory ledger, but the original bytes must survive on
  // disk until the user explicitly chooses a recovery action.
  const openWithCorruptStorage = async corruptedValue => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const safetyPage = await context.newPage();
    const errors = [];
    safetyPage.on('pageerror', error => errors.push(error.message));
    await safetyPage.addInitScript(value => {
      localStorage.setItem('midnightledger_v1', value);
    }, corruptedValue);
    await safetyPage.goto(base, { waitUntil: 'networkidle' });
    assert.ok((await safetyPage.locator('main').count()) > 0, 'app mounted after corrupt load');
    return { context, safetyPage, errors };
  };
  const stored = page0 => page0.evaluate(() => localStorage.getItem('midnightledger_v1'));
  const recoveryInput = page0 => page0.locator('input[aria-label="Choose a backup file for recovery"]');

  // A: original bytes survive, a clear recovery choice is presented, and the
  // non-destructive download keeps the original on disk.
  {
    const corrupted = 'CORRUPTED_ORIGINAL_DO_NOT_LOSE';
    const { context, safetyPage, errors } = await openWithCorruptStorage(corrupted);
    try {
      const recovery = safetyPage.getByRole('alertdialog', { name: 'Recover your saved data' });
      assert.equal(await recovery.count(), 1, 'recovery dialog is shown on corrupt load');
      assert.ok(await recovery.getByText('has not been changed', { exact: false }).count() > 0);
      assert.equal(await stored(safetyPage), corrupted, 'no automatic overwrite on mount');

      const [corruptDownload] = await Promise.all([
        safetyPage.waitForEvent('download'),
        recovery.getByRole('button', { name: 'Download the unreadable data' }).click(),
      ]);
      assert.equal(corruptDownload.suggestedFilename(), 'midnightledger-unreadable-data.txt');
      const corruptPath = await corruptDownload.path();
      assert.ok(corruptPath);
      assert.equal(readFileSync(corruptPath, 'utf8'), corrupted, 'download contains the original bytes');
      assert.equal(await stored(safetyPage), corrupted, 'download does not modify storage');

      // The original remains untouched while the recovery dialog is open.
      assert.equal(await stored(safetyPage), corrupted);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }

  // B: previewing and cancelling a backup during recovery changes nothing.
  {
    const corrupted = 'CORRUPTED_ORIGINAL_CANCEL';
    const { context, safetyPage, errors } = await openWithCorruptStorage(corrupted);
    try {
      const recovery = safetyPage.getByRole('alertdialog', { name: 'Recover your saved data' });
      await recovery.getByRole('button', { name: 'Restore a backup' }).click();
      const recoveryPreview = safetyPage.getByRole('dialog', { name: 'Review backup before importing' });
      await recoveryInput(safetyPage).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(validBackup) });
      await recoveryPreview.waitFor();
      // Recovery preview must not offer to export an empty placeholder ledger.
      assert.equal(await recoveryPreview.getByRole('button', { name: 'Download my current data first' }).count(), 0);
      await recoveryPreview.getByRole('button', { name: 'Cancel' }).click();
      assert.equal(await recoveryPreview.count(), 0);
      assert.equal(await recovery.count(), 1, 'returns to recovery options');
      assert.equal(await stored(safetyPage), corrupted, 'cancel does not overwrite the original');
      assert.equal(await safetyPage.getByText('IMPORTED E2E BILL', { exact: true }).count(), 0);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }

  // C: confirming a backup during recovery is the explicit choice that
  // replaces the corrupted value with the previewed data.
  {
    const corrupted = 'CORRUPTED_ORIGINAL_RESTORE';
    const { context, safetyPage, errors } = await openWithCorruptStorage(corrupted);
    try {
      const recovery = safetyPage.getByRole('alertdialog', { name: 'Recover your saved data' });
      await recovery.getByRole('button', { name: 'Restore a backup' }).click();
      const recoveryPreview = safetyPage.getByRole('dialog', { name: 'Review backup before importing' });
      await recoveryInput(safetyPage).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(validBackup) });
      await recoveryPreview.waitFor();
      await recoveryPreview.getByRole('button', { name: 'Replace my data' }).click();
      await recoveryPreview.waitFor({ state: 'detached' });
      assert.equal(await recovery.count(), 0, 'recovery dialog closes after explicit choice');
      await safetyPage.locator('#mobile-tab-history').click();
      assert.ok(await safetyPage.getByText('IMPORTED E2E BILL', { exact: true }).count() > 0);
      const after = await stored(safetyPage);
      assert.notEqual(after, corrupted, 'explicit restore replaces the corrupt value');
      assert.ok(after.includes('IMPORTED E2E BILL'), 'persisted data is the previewed backup');
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }

  // D: starting fresh is an explicit destructive recovery choice; the
  // corrupted value is replaced only after that choice.
  {
    const corrupted = 'CORRUPTED_ORIGINAL_FRESH';
    const { context, safetyPage, errors } = await openWithCorruptStorage(corrupted);
    try {
      const recovery = safetyPage.getByRole('alertdialog', { name: 'Recover your saved data' });
      assert.equal(await stored(safetyPage), corrupted, 'still untouched before choice');
      await recovery.getByRole('button', { name: 'Start fresh with an empty ledger' }).click();
      await recovery.waitFor({ state: 'detached' });
      const after = await stored(safetyPage);
      assert.notEqual(after, corrupted, 'explicit fresh start replaces the corrupt value');
      assert.ok(after.includes('"paydays":[]'), 'fresh ledger is empty');
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }

  assert.deepEqual(consoleErrors, []);
  console.log('E2E smoke passed: shell, dark theme, skip link, dialog focus trap/restoration, all six screens at mobile+desktop widths, import preview cancel/corrupt/confirm/export-current, corrupted ledger preserved with explicit recovery (download/cancel/backup/fresh).');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
