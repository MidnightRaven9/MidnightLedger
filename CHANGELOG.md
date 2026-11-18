# 📜 Changelog 🌙💜

All notable changes to MidnightLedger ✨

## [3.1.0] - 2026-11-18 🎨
### ✨ Changed
- Complete visual redesign — "Editorial Midnight": near-black surfaces (#101012), off-white type, one champagne-gold accent (#C8A24B), flat cards with hairline borders, no gradients/glows/glassmorphism
- Typography and spacing made systematic (tabular numerals, consistent radii and label scale)
- Wordmark now uses a Lucide moon in a quiet icon tile; toolbar "Bill Optimizer" badge removed

### 🐛 Fixed
- 360dp phones clipped stat values and card titles — responsive clamp() fixes
- Mobile bottom navigation rendered at the top of the screen (stuck inside backdrop-filter header)

### 🗑️ Removed
- Dead code: NextPaydayHero, TaxBadge, SettingsView, useBills/usePaydays/useLocalStorage hooks, utils/storage.ts
- Purple confetti/heart-rain celebration animation (replaced with restrained gold confetti)

## [3.0.2] - 2026-11-18 🎨
### 🐛 Fixed
- Repaired every corrupted image asset in the repo (bytes ≥ 0x80 had been rewritten to U+FFFD upstream)
- Android launcher icon was Capacitor's default teal placeholder; now uses the branded crescent-moon icon across all densities + adaptive icons

### ✨ Changed
- Icon set (web, PWA, Android launcher/adaptive/splash) generated from one SVG via `scripts/generate-icons.mjs`

## [3.0.1] - 2026-11-18 🚫
### 🐛 Fixed
- App no longer runs edge-to-edge / immersive; status bar & navigation bar stay visible on Android 15+
- Mobile bottom navigation rendered at the top of the screen (trapped inside the blurred sticky header)

### 💅 Polished
- Sample data now anchored to the install date instead of hardcoded August 2026
- Thin brand scrollbars, focus-visible rings, tabular numerals, reduced-motion support, safe-area insets

## [3.0.0] - 2026-11-18 📵
### ✨ Added
- Offline Android APK release — the app is 100% local-first, zero network calls; all assets bundled in the APK
- README screenshots (all six tabs) + regeneration script (`npm run screenshots`)

### 🐛 Fixed
- Corrupt `android/gradle/wrapper/gradle-wrapper.jar` broke all Gradle builds; regenerated with Gradle 8.14.3

## [1.0.0] - 2026-08-06 🌙🚀

### ✨ Added
- 📅 Flexible pay periods (biweekly, semi-monthly, custom AUG 15) 🗓️
- 👥 Split bills - my portion vs total 🤝💰
- 🧮 Tax estimates 💵
- 💳 Paycheck allocation cards 💜
- 💸 Expenses & Reports 📈📉
- 🕰️ History view 📚
- 🔒 Local-first storage (localStorage) 🏠
- 🌑 OLED dark theme #0A0A0A with purple #7C3AED 🌙💜
- 📲 PWA support - installs as "MidnightLedger" 📱✨

### 🎨 Design
- 🌙 Horizontal gradient icon purple #7C3AED → #A78BFA 💜
- 🖤 True black OLED background
