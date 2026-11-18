/**
 * Captures README screenshots of every tab at a phone viewport.
 *
 * Usage:
 *   1. Build the app:            npm run build
 *   2. Serve the build statically (any static server, e.g. vite preview):
 *        npm run preview -- --port 4173 --host 127.0.0.1
 *   3. Run:                      npm run screenshots
 *
 * Requires the Chromium headless shell:
 *   npx playwright install chromium-headless-shell
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(repoRoot, 'docs', 'screenshots');
const BASE_URL = process.env.SCREENSHOT_URL || 'http://127.0.0.1:4173';

const TABS = [
  { file: 'dashboard', id: 'mobile-tab-dashboard' },
  { file: 'bills', id: 'mobile-tab-bills' },
  { file: 'paydays', id: 'mobile-tab-paydays' },
  { file: 'expenses', id: 'mobile-tab-expenses' },
  { file: 'reports', id: 'mobile-tab-reports' },
  { file: 'history', id: 'mobile-tab-history' },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
});
const page = await context.newPage();
await page.goto(BASE_URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

for (const tab of TABS) {
  await page.locator('#' + tab.id).click();
  await page.waitForTimeout(1200);
  const file = path.join(OUT_DIR, `${tab.file}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', file);
}

await browser.close();
