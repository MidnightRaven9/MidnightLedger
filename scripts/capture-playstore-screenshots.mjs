/**
 * Captures Play Store screenshots (1080x1920, 16:9) for the F-Droid/Play Store
 * fastlane metadata directory. Overwrites ONLY the six corrupt placeholder PNGs.
 *
 * Usage:
 *   1. npm run build
 *   2. npx vite preview --port 4173 --host 127.0.0.1
 *   3. node scripts/capture-playstore-screenshots.mjs
 *
 * Requires: npx playwright install chromium-headless-shell
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(root, 'fastlane', 'metadata', 'android', 'en-US', 'images', 'phoneScreenshots');
const BASE_URL = process.env.SCREENSHOT_URL || 'http://127.0.0.1:4173';

// Order matches the existing fastlane filenames 1..6.png
const TABS = [
  { file: '1.png', id: 'mobile-tab-dashboard' },
  { file: '2.png', id: 'mobile-tab-bills' },
  { file: '3.png', id: 'mobile-tab-paydays' },
  { file: '4.png', id: 'mobile-tab-expenses' },
  { file: '5.png', id: 'mobile-tab-reports' },
  { file: '6.png', id: 'mobile-tab-history' },
];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
});
const page = await context.newPage();
await page.goto(BASE_URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

for (const tab of TABS) {
  await page.locator('#' + tab.id).click();
  await page.waitForTimeout(1500);
  const file = path.join(OUT_DIR, tab.file);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', file);
}

await browser.close();
