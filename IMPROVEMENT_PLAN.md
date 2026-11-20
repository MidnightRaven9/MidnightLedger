# MidnightLedger v3.2.4 — Improvement Plan

Status key: **Done** (implemented and verified) · **Needs approval** (requires an owner decision) · **Deferred** (documented, not implemented).

Priorities: **P0** = data-integrity/security, **P1** = correctness/robustness, **P2** = accessibility/UX, **P3** = hardening/build hygiene.

---

## Phase 0 — P0: stop cross-user data damage

| # | Item | Priority | Status | Evidence / acceptance |
|---|---|---|---|---|
| 1 | Ownership check before bill/paycheck upsert + `WHERE user_id` predicate | P0 | **Done** | `server.ts:199-221`, `server.ts:34-49`; attacker POST → 403 |
| 2 | Ownership + relational checks on allocation save/delete/read | P0 | **Done** | `server.ts:223-251,376`; attacker allocation → 403, victim → 200 |
| 3 | Non-destructive schema alignment migration | P0 | **Done** | `migrations/0002_allocation_ownership.sql` |
| 4 | Disable financial API by default; gate all non-health `/api/*` | P0 | **Done** | `server.ts:334-336,390,457-459`; default `/api/bills` → 503 |

## Phase 1 — P1: money correctness, local data resilience, data safety

| # | Item | Priority | Status | Evidence / acceptance |
|---|---|---|---|---|
| 5 | Documented cent-rounding policy and shared money helpers | P1 | **Done** | `money.ts` is the single source for frontend/Node/Worker; `roundCents`, `sumMoney`; `calcNet(1450.55,22)=1131.43` |
| 6 | Net-pay calculation no longer rounds to whole dollars | P1 | **Done** | `src/views/PaydaysView.tsx` |
| 7 | Summary totals/outflow/leftover cent-consistent | P1 | **Done** | `src/utils/paydayLogic.ts` |
| 8 | Single source of truth for localStorage loading; corruption preserved on disk | P1 | **Done** | `PaydayContext.tsx:157-208`; `Toast.tsx:9-23` |
| 9 | Remove blocking `alert()` from storage failure path | P1 | **Done** | `PaydayContext.tsx:29-54` |
| 10 | Validate/normalize imports; reject malformed/oversized backups; strip unsafe keys | P1 | **Done** | `src/utils/backup.ts`; unit tests |
| 11 | Include `excludedOccurrences` in exports | P1 | **Done** | `createBackup`; round-trip test |
| 12 | **Import preview/confirmation before replacing the ledger** | P1 | **Done (final review)** | `inspectBackup()` + `ImportSummary`; `src/components/ImportPreviewModal.tsx`; `inspectImport`/`applyImport` at `PaydayContext.tsx:1001-1013`; wired in `Navbar.tsx` and `HistoryView.tsx`; E2E cancel/corrupt/confirm |
| 12a | Show imported record counts and validation warnings | P1 | **Done (final review)** | preview `<dl>` counts + warning list; `inspectBackup()` warnings from normalization |
| 12b | Offer export of current data before replacement | P1 | **Done (final review)** | "Download my current data first" button → `downloadBackup(exportData())` |
| 12c | Regression tests for cancellation, corrupt backups, round trips, warnings, excluded occurrences, export-current | P1 | **Done (final review)** | `tests/unit/backup.test.ts` (5 new tests); `tests/e2e/smoke.mjs` (import preview flows incl. export download) |
| 12d | **Stop silent overwrite of corrupt `midnightledger_v1` on mount** | P1 | **Done (reproduced then fixed)** | E2E first failed with empty-state JSON replacing `CORRUPTED_ORIGINAL_DO_NOT_LOSE`; `recoveryLocked` gate at `PaydayContext.tsx:296,367`; explicit `RecoveryModal` with backup restore / download / fresh start; four E2E scenarios pass |
| 12e | Keep the original corrupt bytes available for manual recovery | P1 | **Done (reproduced then fixed)** | `readRawLedger()` + `downloadCorruptedData()` download the original bytes as `midnightledger-unreadable-data.txt`; blocking `role="alertdialog"` uses the shared `useModalFocus` hook; warning copy states data was not changed |

## Phase 2 — P2: accessibility and product clarity

| # | Item | Priority | Status | Evidence / acceptance |
|---|---|---|---|---|
| 13 | Skip link + `<main>` landmark | P2 | **Done** | `src/App.tsx:63,71`; E2E first tab stop |
| 14 | Dialog roles, labels, focus containment and restoration across overlays | P2 | **Done** | `src/utils/useModalFocus.ts`; 14 overlays + import preview |
| 15 | Keyboard-operable dashboard expansion and category rows | P2 | **Done** | `DashboardView.tsx` |
| 16 | Keyboard-operable horizontal chart scroller | P2 | **Done** | `HorizontalScroller.tsx:61-94` |
| 17 | Focusable, labelled import inputs; toast/warning roles | P2 | **Done** | `Navbar.tsx`, `HistoryView.tsx`, `Toast.tsx` |
| 18 | Contrast, focus-ring, micro-label size, reduced-motion fixes | P2 | **Done** | `src/index.css`; `DashboardView.tsx:41` |
| 19 | Distinguish example records and provide a removal action | P2 | **Done** | `removeDemoData` in `PaydayContext.tsx` |
| 20 | **Full form-label / title-only / chart-alternative audit** (22 placeholder-only inputs, 28 `title=` controls) | P2 | **Done (final review)** | `aria-label`/`aria-pressed`/`aria-expanded`/`aria-current` across all `src/components/*` and `src/views/*`; WCAG luminance in `src/utils/accentColor.ts`; chart `role="img"` + `aria-label`; `isAnimationActive={false}` on all Recharts `<Pie>`; reduced-motion guards in `emojis.ts` and smooth-scroll call sites; contrast tokens raised; `tests/unit/accentColor.test.ts` regression |
| 21 | First-run choice between empty ledger and examples | P2 | **Deferred** | Examples are opt-out via "Remove example data"; product decision |

## Phase 3 — P3: platform, PWA, CI, build hygiene

| # | Item | Priority | Status | Evidence / acceptance |
|---|---|---|---|---|
| 22 | Disable WebView debugging; pin safe WebView defaults | P3 | **Done** | `capacitor.config.ts:5-11`, `MainActivity.java:9-17` |
| 23 | Production service worker + CSP/security headers | P3 | **Done** | `public/sw.js`, `public/_headers`, production Express CSP, build-content cache stamp, visibility-triggered update check |
| 24 | CI: permissions, timeouts, Node pin, lint/unit/integration/audit/build/E2E | P3 | **Done** | `.github/workflows/ci.yml` |
| 25 | Unit/integration/E2E tests without new dependencies | P3 | **Done** | `tests/`; 45 passing tests (43 unit + 2 integration), E2E passing |
| 26 | Signed release APK | P3 | **Needs approval** | `docs/RELEASE.md` documents exact steps; owner keystore required; not performed |
| 27 | Real authentication/authorization for the financial API | P0 | **Done (code + owner-approved deploy)** | `apiCore.ts` + `worker.ts`: register/login/logout, PBKDF2-SHA256 (100,000 iterations for Worker compatibility), hashed opaque 32-byte bearer tokens, 24h expiry, revocation; `x-user-id` ignored; `migrations/0003_auth.sql`; deployed to Worker with D1 `DB`/`ASSETS` bindings and live smoke test |
| 28 | **Pin GitHub Actions to commit SHAs** | P3 | **Done (final review)** | `.github/workflows/ci.yml`: `actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4`, `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4` |
| 29 | Untrack committed `dist/` build output | P3 | **Needs approval** | `.gitignore` ignores `dist/`; proposed `git rm --cached -r dist` not run; tracked files restored after each build |
| 30 | **Android release/signing/version/permission documentation** | P3 | **Done (final review)** | `docs/RELEASE.md` with exact steps and manual verification checklist; linked from `README.md` and `docs/DOWNLOAD.md` |
| 31 | **Multi-screen mobile/desktop UI QA** | P3 | **Done (final review)** | E2E sweeps all six screens at 390px and 1280px with content assertions and zero page errors |
| 32 | Merged Android notification permissions decision | P3 | **Needs approval** | `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` from local-notifications plugin; reconcile privacy wording |

## Phase 4 — current remediation pass (auth, money, reliability)

| # | Item | Priority | Status | Evidence / acceptance |
|---|---|---|---|---|
| 33 | Replace `x-user-id` with real auth in Express and Worker | P0 | **Done** | `apiCore.ts`, `server.ts`, `worker.ts`; session-derived `user_id`; spoofed header → 401; missing/invalid/expired/revoked token → 401 |
| 34 | Non-destructive auth schema migration | P0 | **Done** | `migrations/0003_auth.sql` adds username/password columns and `sessions`; no existing row deletion or rewrite |
| 35 | Single shared money policy + cent-safe sums | P1 | **Done** | `money.ts`; `roundCents`/`sumMoney` used by frontend and API; boundary tests incl. `1.005`, `-8.575`, large values |
| 36 | Preserve custom/percentage/even/legacy split meaning | P1 | **Done** | `calculations.ts`, `backup.ts`, `BillModal.tsx`, `PaydayContext.tsx`; explicit `customMyShare` wins; backup round-trip test |
| 37 | Remove duplicate financial localStorage writes and sensitive exception logs | P1 | **Done** | `PaydayContext.tsx`, `safeLog.ts`; no `bills`/`myBills` shadow writes; fixed log messages only |
| 38 | Build-derived PWA cache invalidation | P2 | **Done** | `scripts/stamp-sw.mjs`, `package.json`, `public/sw.js`, `main.tsx`; stamped `e181761c19bde2bd35e9`; API/cross-origin never cached |
| 39 | Regression tests for auth, Worker, SW, money and splits | P1 | **Done** | `tests/unit/auth.test.ts`, `worker.test.ts`, `serviceWorker.test.ts`, updated calculations/backup; `npm test` 45/45 |
| 40 | Correct CORS scope so static assets and health are never blocked | P1 | **Done** | Express + Worker origin checks restricted to financial API; same-origin always allowed; unit/integration/E2E pass |
| 41 | Fix live Worker deployment defects found by smoke test | P0 | **Done** | Added `ASSETS` binding and JSON health route; lowered PBKDF2 to Workers' 100,000-iteration cap with stored counts; redeployed and verified live |

---

## Sequencing and release gate

1. **Before any release:** items 1–20, 22–25, 28, 30–31 and 33–40 (all Done) must remain green in CI.
2. **Financial API public exposure:** item 27 is Done and the owner-approved Worker deployment is live and smoke-tested. The source default stays disabled and item 4 remains in place. Registration is open to anyone who knows the Worker URL — add an invite code or allowlist if the API must be private.
3. **Before publishing an Android release:** items 26 and 32 must be resolved and approved.
4. **Repository hygiene:** item 29 requires owner approval to untrack generated output.

The only deployment performed is the owner-approved Worker activation above. No data wipe, history rewrite, release publication, Android signing, or untracking of `dist/` was performed. Cloudflare credentials were never received or stored; Wrangler authenticated through owner-approved OAuth.
