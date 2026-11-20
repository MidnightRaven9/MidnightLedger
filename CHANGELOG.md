# 📜 Changelog 🌙💜

All notable changes to MidnightLedger ✨

## [3.2.0] - 2026-11-20 🔔
### ✨ Added
- **Bill reminders** — a bell in the header shows unpaid bills that are due soon, with a count badge
- Reminder panel lists each due bill with days-until, due date and amount, plus a one-tap "mark paid" button
- **Local OS notifications** (Android) warn you *before* a bill is due, with a configurable days-ahead window (1/3/5/7/14 days) and an opt-in toggle with proper permission handling
- Notification settings live in the Settings sheet alongside the appearance controls
- **"About the maker"** section in Settings with links to the GitHub repo and GitHub Sponsors (buy me a coffee ☕)
- Purple notification icon and accent-coloured notification channel

### 💜 Changed
- Fluid auto-sizing layout now adapts cleanly from **320px to 1920px** — no more clipping at odd widths like 390px or 768px
- Stat cards, action buttons and bill rows use `auto-fit` grids and clamped typography so they fit any phone, tablet or desktop
- Header gutters scale with viewport width

### 🐛 Fixed
- Long category names (e.g. "Groceries & Household Supplies") no longer collapse into a tiny column
- `+ Add Extra Cash` and `✓ Mark All Paid` buttons no longer overflow their container
- "10 Paydays" stat and the collapsible Bills/Expenses headers no longer clip

## [3.1.1] - 2026-11-19 🔧
### 🎨 Added
- **Appearance settings** — gear icon in the header opens a colour picker for the whole UI and the celebration confetti
- 8 curated preset colours, a hex-code field, and a native colour wheel
- Choice is saved locally and restored on launch (works offline, no account)

### 💜 Changed
- Restored **purple** as the default accent (`#a855f7`); confetti is purple again
- Brand icon and splash screens returned to the purple gradient

### 🐛 Fixed
- "Smushed" phone layout: stat cards now use full-width rows on narrow screens instead of cramped 2-up tiles
- Removed text truncation/clipping across dashboard, bills, paydays, reports and the legend on 360dp screens
- "Add Custom Date" / "Change Rule" buttons stack on narrow phones so labels fit
- Bottom navigation "Expenses" label no longer clips

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
