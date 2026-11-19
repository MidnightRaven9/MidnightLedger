/**
 * Generates every icon & splash asset for MidnightLedger from one SVG design:
 *   black rounded square -> purple gradient crescent moon -> 3 ledger lines
 *
 * Outputs:
 *   public/                 web icons (512/192/180/32)
 *   android/.../mipmap-*    launcher icons (per density, incl. adaptive foreground)
 *   android/.../drawable*   splash screens (per density, portrait + landscape)
 *
 * Usage:  node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- Brand SVG fragments ----------

const DEFS = `
  <defs>
    <linearGradient id="purple-grad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="55%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#C084FC"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#A855F7" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#A855F7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#C084FC"/>
    </linearGradient>
    <mask id="moon-mask">
      <circle cx="256" cy="206" r="118" fill="#FFFFFF"/>
      <circle cx="304" cy="172" r="118" fill="#000000"/>
    </mask>
  </defs>`;

// Full icon artwork (bg transparent) - reused for web icons & adaptive foreground
const ARTWORK = `
  <rect x="0" y="0" width="512" height="512" fill="url(#glow)"/>
  <rect x="56" y="48" width="400" height="330" fill="url(#purple-grad)" mask="url(#moon-mask)"/>
  <rect x="88" y="356" width="336" height="16" rx="8" fill="url(#line-grad)"/>
  <rect x="88" y="398" width="252" height="16" rx="8" fill="url(#line-grad)" opacity="0.85"/>
  <rect x="88" y="440" width="168" height="16" rx="8" fill="url(#line-grad)" opacity="0.7"/>`;

// Web icons: full-bleed #101012, artwork inside the 80% maskable safe zone
const webIconMaskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${DEFS}
  <rect width="512" height="512" fill="#101012"/>
  <g transform="translate(51 51) scale(0.8)">
    ${ARTWORK}
  </g>
</svg>`;

// iOS icon: full black square, safe-zone artwork
const appleIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  ${DEFS}
  <rect width="180" height="180" fill="#101012"/>
  <g transform="translate(18 18) scale(0.28)">
    ${ARTWORK}
  </g>
</svg>`;

// Classic rounded-square web icon (used for favicon)
const iconSvg = ({ rounded }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${DEFS}
  ${rounded ? `<rect width="512" height="512" rx="112" fill="#101012"/>` : ''}
  ${ARTWORK}
</svg>`;

// Adaptive foreground: artwork scaled into the ~66% safe zone, transparent bg
const adaptiveForegroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${DEFS}
  <g transform="translate(85 85) scale(0.67)">
    ${ARTWORK}
  </g>
</svg>`;

// Splash: black background, centered artwork (no rounded square)
const splashSvg = (w, h, artworkPx) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${DEFS}
  <rect width="${w}" height="${h}" fill="#101012"/>
  <g transform="translate(${(w - artworkPx) / 2} ${(h - artworkPx) / 2 - h * 0.02}) scale(${artworkPx / 512})">
    ${ARTWORK}
  </g>
</svg>`;

// ---------- Output helpers ----------

const outPath = (rel) => path.join(root, rel);
const ensureDir = (rel) => fs.mkdirSync(path.dirname(outPath(rel)), { recursive: true });
const renderPng = (svg, size, rel) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath(rel)).then(() => console.log('  ', rel));

async function run() {
  console.log('▸ Web icons (maskable, safe zone)');
  const webIconMaskable = webIconMaskableSvg;
  await renderPng(webIconMaskable, 512, 'public/icon-512.png');
  await renderPng(webIconMaskable, 192, 'public/icon-192.png');
  await sharp(Buffer.from(appleIconSvg)).png().toFile(outPath('public/apple-touch-icon.png'));
  console.log('  public/apple-touch-icon.png');
  await renderPng(iconSvg({ rounded: true }), 32, 'public/favicon.png');

  console.log('▸ Android launcher icons (rounded-square, legacy)');
  const androidWebIcon = iconSvg({ rounded: true });
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [name, size] of Object.entries(densities)) {
    ensureDir(`android/app/src/main/res/mipmap-${name}/ic_launcher.png`);
    await renderPng(androidWebIcon, size, `android/app/src/main/res/mipmap-${name}/ic_launcher.png`);
    await renderPng(androidWebIcon, size, `android/app/src/main/res/mipmap-${name}/ic_launcher_round.png`);
  }

  console.log('▸ Android adaptive foregrounds (safe-zone, transparent)');
  const fgDensities = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  for (const [name, size] of Object.entries(fgDensities)) {
    await renderPng(adaptiveForegroundSvg, size, `android/app/src/main/res/mipmap-${name}/ic_launcher_foreground.png`);
  }

  console.log('▸ Android splash screens');
  const splashPortrait = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
  for (const [name, [w, h]] of Object.entries(splashPortrait)) {
    ensureDir(`android/app/src/main/res/drawable-port-${name}/splash.png`);
    await sharp(Buffer.from(splashSvg(w, h, Math.round(w * 0.42)))).png().toFile(outPath(`android/app/src/main/res/drawable-port-${name}/splash.png`));
    console.log('   drawable-port-%s/splash.png (%dx%d)', name, w, h);
    const lw = h, lh = w; // landscape = rotated dims
    ensureDir(`android/app/src/main/res/drawable-land-${name}/splash.png`);
    await sharp(Buffer.from(splashSvg(lw, lh, Math.round(lh * 0.42)))).png().toFile(outPath(`android/app/src/main/res/drawable-land-${name}/splash.png`));
    console.log('   drawable-land-%s/splash.png (%dx%d)', name, lw, lh);
  }
  await sharp(Buffer.from(splashSvg(480, 800, 200))).png().toFile(outPath('android/app/src/main/res/drawable/splash.png'));
  console.log('   drawable/splash.png (480x800)');

  console.log('✔ All icons generated');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
