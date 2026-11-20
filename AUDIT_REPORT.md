# MidnightLedger v3.2.4 — Principal Engineering Audit Report

**Audit date:** 2026-11-20 (final production-readiness review)
**Baseline:** clean tree at `2dd6995` (`fix(reports): match chart scroll extent and clean up chart C…`)
**Released version:** v3.2.4 — https://github.com/MidnightRaven9/MidnightLedger/releases/tag/v3.2.4
**Scope:** `server.ts` (Express dev server + Cloudflare Worker handler), `src/` (React app), Android/Capacitor shell, PWA assets, CI, backup/import/export, money math, accessibility, repository hygiene.
**Method:** source review, live proof-of-concept against an isolated database, then code fixes followed by independently executed unit/integration/E2E verification. Findings are reported only where evidence exists; no exploitability is claimed without a reproduced result.

---

## 1. Executive summary

The shipped app is offline-first, stores all financial data in `localStorage`, and has no account system. The optional financial API is **not used by the app** and was previously reachable by default with only a client-supplied `x-user-id` header as "authentication". The audit found two reproduced cross-user data-integrity defects in that API, a class of cent-rounding defects in the money math, a **reproduced** destructive corruption-recovery path in local persistence (a corrupt stored value was silently overwritten by an empty ledger on mount), an incomplete backup format, and significant keyboard/screen-reader gaps. Android WebView hardening, a production service worker, and CI test coverage were also missing.

All reproduced defects were fixed and verified. A final focused production-readiness review then closed the remaining Priority 1–6 gaps: **backup import preview with explicit confirmation**, the **full form-label/ARIA audit**, **chart text alternatives**, **Android release documentation**, **GitHub Actions SHA pinning**, and **multi-screen mobile/desktop UI QA**. A final critical data-safety check then reproduced and fixed the silent corruption overwrite, adding an explicit, blocking recovery flow.

The largest **unresolved** risk is architectural: when the financial API is explicitly enabled it still relies on a client-supplied UUID for identity, which is not authentication. It is therefore disabled by default and every non-health `/api/*` route is gated behind `ENABLE_FINANCIAL_API=1`. Enabling it on a public host remains a decision that requires an actual auth design and is **not** approved for release here.

| Severity | Findings | Fixed | Deferred / needs approval |
|---|---|---|---|
| Critical | 2 | 2 | 0 |
| High | 5 | 5 | 0 (API identity model still needs approval before enabling) |
| Medium | 3 | 3 | 0 |
| Low / UX & build hygiene | 7 | 7 | 0 (signed APK + `dist/` untracking need owner approval) |

A signed release APK remains outstanding: release signing, keystore provision and artifact publication all require owner credentials and explicit approval. Exact steps are documented in `docs/RELEASE.md`.

**Verification executed (not assumed):** `npm run lint` pass; `npm test` 27/27 pass; `npm run build` pass; `npm run test:e2e` pass (all six screens at mobile+desktop widths, import preview cancel/corrupt/confirm/export-current, and four explicit-recovery scenarios proving the corrupt value survives download/cancel and is replaced only by an explicit choice); `npm audit` 0 vulnerabilities. See `TEST_REPORT.md` for commands and outputs.

---

## 2. Findings and fixes

### CRITICAL-1 — Cross-user bill overwrite via client-supplied record id

**Location:** `server.ts:199-209` (`saveBill`), originally the `ON CONFLICT(id) DO UPDATE SET …` upsert with no ownership predicate.
**Reproduction (baseline):** POST `/api/bills` with the victim's bill `id` and attacker-controlled `name`/`amount`, using the attacker's `x-user-id`. The upsert matched on primary key and overwrote the victim's row, including its `user_id`.
**Actual result (fixed, `server.ts:203-207`):** the handler reads `SELECT user_id FROM bills WHERE id = ?` and returns `403` when the owner differs; the upsert also carries `WHERE bills.user_id = excluded.user_id` (`server.ts:34-40`). Verified: attacker POST → 403; victim bill unchanged.
**Same class fixed for paychecks:** `server.ts:211-221`, `server.ts:41-49`.

### CRITICAL-2 — Allocation ownership / relational integrity gap

**Location:** `server.ts:223-241` (`saveAllocation`), originally inserted any `paycheck_id`/`bill_id` pair without checking ownership.
**Actual result (fixed):** `server.ts:227-238` requires both referenced records to be owned by the caller; the upsert predicate (`server.ts:50-59`) prevents re-pointing; deletes are scoped (`server.ts:248-251`); reads join through the caller's paychecks (`server.ts:376`). Verified live: attacker allocation 403, victim allocation 200, attacker delete had no effect. Non-destructive alignment migration: `migrations/0002_allocation_ownership.sql`.

### HIGH-1 — Financial API reachable by default without real authentication

**Location:** route registration `server.ts:334-390`; Worker gate `server.ts:457-466`.
**Fix:** shared `apiGate` returns `503` for every non-health API route unless `ENABLE_FINANCIAL_API=1`; `/api/health` stays reachable. User-id normalisation is centralised at `server.ts:142-148`.
**Residual risk (HIGH, unresolved):** when enabled, identity is still a self-declared UUID. Adequate for local/single-user dev use, **not** for an internet-facing multi-user service. Keep disabled in production.

### HIGH-2 — WebView debugging and permissive WebView defaults on Android

**Fix:** `loggingBehavior: 'none'`, `allowMixedContent: false`, `webContentsDebuggingEnabled: false` in `capacitor.config.ts:5-11`; `MainActivity.java:11-16` disables file/content access and mixed content.
**Residual:** the published APK is still **debug-signed** (`README.md:31`). A signed release build requires the owner's keystore and approval — documented in `docs/RELEASE.md`, not performed here.

### HIGH-3 — Corrupt persisted state silently reseeded with demo data

**Fix:** one `loadStoredState()` read; a missing key means first run, an unreadable key is loaded as an empty in-memory ledger (`PaydayContext.tsx:190-219`). `safeSave` no longer calls blocking `alert()`.

### HIGH-5 — Corrupt stored value silently destroyed by the mount-time persistence effect (data-loss risk, reproduced and fixed)

- **Reproduction:** regression E2E seeded `midnightledger_v1` with invalid JSON before boot. After mount, `localStorage.getItem('midnightledger_v1')` returned a fresh empty-state JSON document (`{"schedule":…,"paydays":[],"bills":[],…}`) instead of the seeded value. The assertion failed with `actual: '{"schedule":…}', expected: 'CORRUPTED_ORIGINAL_DO_NOT_LOSE'` — confirming the original bytes were overwritten.
- **Root cause:** `loadStoredState()` returned `{ state: null, corrupt: true }`, so the provider fell back to `EMPTY_STATE` (line 285). The persistence `useEffect` then ran on mount and called `safeSave('midnightledger_v1', …)` unconditionally, and line 371 cleared the corruption warning on a successful save — so the user lost both the data and the warning.
- **Fix:**
  - `recoveryLocked` state is initialised from `initialLoad.corrupt` (`PaydayContext.tsx:296`); the persistence effect returns early while locked (line 367), so no automatic write can touch the original value.
  - `src/components/RecoveryModal.tsx` (new) presents a blocking `role="alertdialog"` with three explicit choices: **Restore a backup**, **Download the unreadable data**, and **Start fresh with an empty ledger**. It states that the original data has not been changed.
  - `applyImport()` (backup restoration, line 1022) and the new `startFresh()` (lines 1028–1040) are the only paths that unlock persistence; `downloadCorruptedData()` (line 1044) saves the original bytes via `downloadBackup()` without changing anything.
  - The warning toast copy now explicitly says the original data is still on the device and has not been changed.
- **Post-fix evidence:** four E2E scenarios pass — (A) original preserved on mount and after downloading it; (B) backup preview + cancel leaves it untouched; (C) explicit restore replaces it with the previewed data; (D) explicit fresh start replaces it with an empty ledger. No page errors in any scenario.

### HIGH-4 — Backup/import accepted unvalidated JSON and lost excluded occurrences

**Fix:** `parseBackup` validates version/shape and limits; `normalizePersistedState` clamps amounts/dates, strips control characters, enforces record/map caps, and drops `__proto__`/`constructor`/`prototype` keys (`src/utils/backup.ts:24-34,66-79`). Legacy `paychecks`/`expenses`/`extraCash` keys remain accepted. `createBackup` includes `excludedOccurrences`.
**Final review closure:** added a pure `inspectBackup()` preview with record counts and validation warnings, a confirm dialog (`src/components/ImportPreviewModal.tsx`), and `applyImport()` that applies exactly the previewed state (`PaydayContext.tsx:980-1006`). Wired into both `Navbar.tsx` and `HistoryView.tsx`; exports now use a shared `downloadBackup()` helper (`src/utils/downloadBackup.ts`). Verified by unit tests (cancel/corrupt/round-trip/warnings/excluded occurrences) and E2E (cancel, corrupt, confirm).

### MEDIUM-1 — Monetary values rounded inconsistently

**Fix:** documented USD-number policy with cent rounding at calculation time (`roundCents`, `getMyShare`, `getFullTotal`, `calcNet`); `PaydaysView` uses `calcNet`; summary totals are cent-rounded. **No stored data was rewritten** — no migration, no persistence type change.

### MEDIUM-2 — No CSP or offline service worker on static hosting

**Fix:** strict CSP plus security headers in `public/_headers:1-8`, and a production-only service worker `public/sw.js:1-31` that precaches the app shell and never intercepts `/api/*` or cross-origin requests. Registered only when `import.meta.env.PROD`.
**Residual:** the local Express server sets only a subset of headers (`server.ts:306-311`).

### MEDIUM-3 — CI had no tests and used unpinned permissions

**Fix:** `permissions: contents: read`, job timeouts, `.nvmrc`-pinned Node, and steps for lint, unit, integration, `npm audit --audit-level=high`, build, and E2E.
**Final review closure:** actions pinned to reviewed commit SHAs (`actions/checkout@11d5960…`, `actions/setup-node@49933ea…`) in `.github/workflows/ci.yml`.

### LOW / UX — Accessibility and clarity

Critical keyboard/screen-reader fixes are detailed in `UI_UX_REVIEW.md`: skip link + main landmark, dialog focus trap/restoration across 14 overlays, keyboard-operable dashboard/category controls, `HorizontalScroller` keyboard support, announced toasts/warnings, contrast/focus-ring fixes, and demo-data badges/removal.

**Final review closure:** the remaining 22 placeholder-only inputs, title-only controls, unlabeled icon buttons, clickable divs, disclosures, segmented controls, chart alternatives, reduced-motion gaps, contrast failures, landmark labels, heading order and live regions were systematically fixed across `src/components/*` and `src/views/*`. Verified by `npm run lint`, `npm test` and the E2E mobile/desktop screen sweep. See `UI_UX_REVIEW.md` for the exact list.

---

## 3. Constraints honoured

- Offline-first, no account/login, local-only financial data: unchanged. No cloud sync, analytics, auth service, or third-party tracking added.
- Existing backups still import (version `1.0`, legacy keys) and exports remain JSON; no data wipe or auto-migration performed.
- Monetary values remain USD `number`; derived values use documented cent rounding.
- Product identity and dark theme preserved; no visual redesign.
- No deploy, automatic data deletion, or release publication performed. The only path that replaces a corrupt stored value is an explicit in-app recovery choice by the user.
- `fastlane/metadata/` was not touched (owner later granted permission, but no change was needed).

---

## 4. Unresolved risks / items requiring approval

1. **API identity model (HIGH):** `x-user-id` is client-controlled. Keep the financial API disabled in production; a real auth design is required before any public exposure.
2. **Signed release APK (HIGH):** currently debug-signed per `README.md:31`. Needs an owner-provided keystore and explicit approval. Exact steps and manual verification checklist are in `docs/RELEASE.md`. **No credentials were created, published or overwritten.**
3. **Merged Android permissions (MEDIUM):** the local-notifications plugin adds `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`. Owner decision needed on whether to keep the reminder feature and reconcile the "no permissions" wording in `README.md:20,31` / `SECURITY.md`.
4. **Tracked `dist/` output (LOW):** 12 generated files remain tracked though `dist/` is git-ignored. Proposal (not run): `git rm --cached -r dist`. After every build the tracked files were restored to their committed state so the repo stays self-consistent; production releases must rebuild `dist/` first.
5. **Android CI job (LOW):** no Android build/signing job exists; adding one requires owner approval and JDK 21 + Android SDK provisioning.
6. **Speculative config (LOW):** Google Services plugin with no Firebase dependency, misplaced `@types/canvas-confetti`, `wrangler`, and unused `androidTest` dependencies were flagged but not removed (owner decision).

---

## 5. Deliverables

- `IMPROVEMENT_PLAN.md` — prioritised remediation plan and final status.
- `SECURITY_REVIEW.md` — threat model, PoCs, fixes, residual risks.
- `UI_UX_REVIEW.md` — accessibility/design findings and final fixes.
- `TEST_REPORT.md` — executed test commands, counts, and CI wiring.
- `docs/RELEASE.md` — exact Android signing/versioning/permission and manual-verification steps.
