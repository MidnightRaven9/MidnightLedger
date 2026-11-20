# MidnightLedger v3.2.4 — UI/UX & Accessibility Review

**Date:** 2026-11-20 (final production-readiness review)
**Baseline:** `2dd6995`
**Scope:** React component tree (`src/components/`, `src/views/`, `src/App.tsx`), design tokens (`src/index.css`), import preview dialog, toast/warning surfaces, demo-data onboarding, multi-screen mobile/desktop E2E sweep.
**Constraints preserved:** dark theme, product identity, offline-first workflow, no account/login. No visual redesign was performed.

Review method: static inspection of interactive controls and dialogs, contrast-token review, a systematic accessible-name audit, and executed Playwright keyboard/focus tests (`tests/e2e/smoke.mjs`). Findings distinguish fixed issues from remaining gaps; no "passes WCAG" claim is made without a full screen-reader audit on real devices.

---

## 1. Critical accessibility defects (fixed in earlier audit)

### UX-01 — Dialogs had no semantics, focus containment, or focus restoration

- **Fix:** shared hook `useModalFocus` (`src/utils/useModalFocus.ts`) traps Tab within visible focusable elements and restores focus on close. Applied to 14 overlays plus the new `ImportPreviewModal`. Each panel carries `role="dialog"`, `aria-modal="true"`, a descriptive name and `tabIndex={-1}`.
- **Verified:** E2E opens "Add New Bill", presses Tab 12 times, asserts focus stays inside, presses Escape, asserts focus returns to the trigger.

### UX-02 — No skip link and no main landmark

- **Fix:** skip link and `<main id="main-content" tabIndex={-1}>` in `src/App.tsx`.
- **Verified:** E2E asserts "Skip to content" is the first tab stop.

---

## 2. Keyboard and interaction fixes

| Item | Before | Fix | Location |
|---|---|---|---|
| Dashboard payday expansion | click-only `<div>` | focusable `<button>` with `aria-expanded` | `DashboardView.tsx` |
| Category rows in spending summary | click-only `<div>` | focusable `<button>` with `aria-expanded` | `DashboardView.tsx` |
| Horizontal chart scroller | pointer-only drag bar | focusable scroll area + Arrow/Home/End keys | `HorizontalScroller.tsx:61-94` |
| Import controls | `display:none` inputs | `sr-only` inputs with `aria-label`, `focus-within` ring | `Navbar.tsx`, `HistoryView.tsx` |
| Toast / warnings | unannounced `div` | `role="status"`/`aria-live="polite"`; `role="alert"` for warnings | `Toast.tsx` |

---

## 3. Final review — systematic accessible-name and ARIA closure

The 22 placeholder-only inputs and 28 title-only controls identified in the earlier audit were systematically fixed. No visual layout changed; only programmatic attributes and contrast tokens were adjusted.

### 3.1 Form labels and control names

- **`aria-label` added to every placeholder-only input** across `BillModal.tsx`, `ExpenseModal.tsx`, `PaydayModal.tsx`, `ScheduleModal.tsx`, `AddExtraIncomeModal.tsx`, `ClearDataModal.tsx`, `CustomCategoryModal.tsx`, `BillCard`-related views, `DashboardView.tsx`, `BillsView.tsx`, `ExpensesView.tsx`, `PaydaysView.tsx`, and `ReportsView.tsx`. Names derive from the adjacent visible label text.
- **Unlabeled inputs without placeholders** in the same files received `aria-label` (dates, selects, amount editors, tax fields, category selectors).
- **Icon-only close buttons** in 11 modal components now carry `aria-label` (e.g. "Close bill editor", "Close delete confirmation").
- **Title-only controls** now carry matching `aria-label`: export/wipe in `Navbar.tsx`, emoji inputs in `BillModal.tsx`/`ExpenseModal.tsx`, skip/edit/delete in `BillCard.tsx`, manage-categories in `BillsView.tsx`/`ExpensesView.tsx`, delete/mark-paid in `PaydaysView.tsx`, mark-paid/edit-amount in `DashboardView.tsx`, edit/delete expense in `ExpensesView.tsx`.
- **Unlabeled checkboxes** "Split this bill?" and "Mark as Debt / Loan?" in `BillModal.tsx` received `aria-label`, and their visual toggles gained `peer-focus-visible` rings; `peer-focus:outline-none` was removed.
- **Repeated "Remove" buttons** in `EditItemsModal.tsx` now include the item name in the accessible name.

### 3.2 Keyboard, state and landmarks

- **Clickable divs converted / made operable:** bill rows in `DashboardView.tsx` and `PaydaysView.tsx`, expense rows in `ExpensesView.tsx`, the "Est. Check" editor in `PaydaysView.tsx`, and the brand link in `Navbar.tsx` (now a real `<button>`). Each has `role="button"`, `tabIndex={0}` and Enter/Space handlers where a div was retained.
- **Disclosure state:** `aria-expanded` + `aria-controls` added to the notification panel, Bills/Expenses/category disclosures, and the "next cycle" toggle; revealed regions received matching `id`s.
- **Selection state:** `aria-pressed` on My Share/Full Totals, bill-type, payment-option, days-ahead, EditItems tabs, and all History filter/month buttons. `aria-current="page"` on desktop and mobile nav tabs.
- **Landmarks:** desktop `<nav aria-label="Primary navigation">` and mobile `<nav aria-label="Mobile navigation">`.
- **Progress semantics:** allocation progress bar in `DashboardView.tsx` now has `role="progressbar"` with `aria-valuenow/min/max`.
- **Pagination dots** in `DashboardView.tsx` are real `<button>`s with `aria-label` and `aria-current`, with identical visual styles.
- **Focus visibility:** the `opacity-0` colour input in `SettingsModal.tsx` now has a `focus-within` ring on its label; checkbox toggles gained `peer-focus-visible` rings.

### 3.3 Charts and text alternatives

- Donut charts (`CategoryPieChart.tsx`) and bar/line charts (`ReportsView.tsx`) now have `role="img"` and descriptive `aria-label`s on their wrappers. Existing category lists and data tables remain as text alternatives.
- Category distribution bar in `BillsView.tsx` has `role="img"` + `aria-label`.
- All Recharts `<Pie>` elements now set `isAnimationActive={false}` so reduced-motion is respected (JS animation ignores the CSS media query).
- Legend rows with visible text were left unchanged.

### 3.4 Contrast, motion and structure

- Low-contrast placeholders (`text-white/20`, `white/30`, `placeholder-zinc-500`) raised to `var(--faint)` in `ClearDataModal.tsx`, `AddExtraIncomeModal.tsx`, `BillsView.tsx`, and `ExpensesView.tsx`.
- Normal-text uses of `text-white/40` and `text-zinc-500` raised to `var(--faint)` across `BillCard.tsx`, `CategoryPieChart.tsx`, `EditItemsModal.tsx`, `DashboardView.tsx`, `BillsView.tsx`, `ExpensesView.tsx`, `PaydaysView.tsx`, and `HistoryView.tsx`. Glyph/icon uses were left unchanged.
- `getContrastText` in `src/utils/accentColor.ts` now uses proper WCAG sRGB relative luminance and picks dark/light text by maximum contrast ratio. Regression-tested in `tests/unit/accentColor.test.ts`.
- `prefers-reduced-motion` guards added to the confetti trigger (`src/utils/emojis.ts`) and both `scrollIntoView({ behavior: 'smooth' })` call sites (`DashboardView.tsx`, `HistoryView.tsx`).
- Heading order corrected: one page-level `<h1>` per view with section `<h2>`/`<h3>` across all views.
- "Last saved" status in `HistoryView.tsx` now has `aria-live="polite"` / `aria-atomic="true"`.

### 3.5 Import preview UX

- `ImportPreviewModal.tsx` presents record counts, validation warnings, excluded-occurrence preservation, a cancel action, a destructive confirm action, and a "Download my current data first" escape hatch. Corrupt backups show an inline error with replacement disabled. Uses the same focus-trap hook and dark-theme tokens as existing dialogs.
- Export-current-data was verified with a real Playwright download event: filename pattern and JSON structure (`"bills"`, `"excludedOccurrences"`) asserted, preview stays open, and no import is applied.

### 3.6 Corrupt-storage recovery UX

- `RecoveryModal.tsx` (new) appears only when a stored ledger cannot be read. It is a blocking `role="alertdialog"` with `aria-modal="true"`, labelled heading and described text, using the shared `useModalFocus` hook. It does not close on Escape/overlay click because a choice is required to lift the persistence lock.
- Copy states plainly that the original data is still on the device and **has not been changed**, backed by a `role="status"` confirmation that nothing was silently overwritten.
- Three clearly named actions: **Restore a backup** (primary), **Download the unreadable data** (non-destructive), and **Start fresh with an empty ledger** (destructive, rose styling). A footnote explains that only restoring a backup or starting fresh replaces the unreadable value, that this cannot be undone, and that downloading keeps a copy without changing anything.
- The nested backup preview reuses `ImportPreviewModal` with `showExportCurrent={false}` so it never offers to export an empty placeholder ledger; only one modal is mounted at a time, avoiding competing focus traps.
- E2E verified: original bytes survive mount, backup-preview cancel, and the unreadable-data download; only explicit restore or fresh start replaces them.

---

## 4. Visual and motion fixes (earlier audit, preserved)

- `--faint` raised from `#6b6b74` to `#8b8b96` (`src/index.css:17`).
- Solid accent focus outline (`src/index.css:79`); Recharts `:focus-visible` 2px accent outline restored.
- Micro-label font 10px → 11px (`src/index.css:152`).
- Dashboard number animation snaps to final value under reduced motion (`DashboardView.tsx:41`).
- Example bills/paydays are badged "Example" and removable via Settings.
- Destructive icon button labelled "Wipe all data (factory reset)" matching its actual behaviour.

---

## 5. Remaining gaps

1. **First-run choice:** the app seeds examples on first run and offers opt-out; no upfront "start empty" choice (item 21, product decision).
2. **Real screen-reader verification:** headings, labels and roles were verified statically and via DOM assertions; a full VoiceOver/TalkBack pass on physical devices was not possible in this environment.
3. **Hover-only chart tooltips:** text alternatives now exist, but touch users still cannot trigger the detailed tooltips (supplementary).
4. **Android on-device QA:** not performed; no signed release artifact exists (`docs/RELEASE.md`).

---

## 6. Verification performed

`npm run test:e2e` executed against a fresh production build passed with:
`E2E smoke passed: shell, dark theme, skip link, dialog focus trap/restoration, all six screens at mobile+desktop widths, import preview cancel/corrupt/confirm/export-current, corrupted ledger preserved with explicit recovery (download/cancel/backup/fresh).`

The E2E test (390×844 mobile viewport, then 1280×800 desktop) asserts: page title, dark theme, product name, skip link as first tab stop, dialog open/focus-trap/Escape/restore, every tab rendering at both widths, main landmark, import preview cancel/corrupt/confirm/export-current, four corrupt-storage recovery scenarios, and zero page errors. This is a functional/keyboard audit, not a substitute for a physical screen-reader review.

`npm run lint`, `npm test` (27/27), `npm run build`, and `npm audit` (0 vulnerabilities) also passed; see `TEST_REPORT.md`.
