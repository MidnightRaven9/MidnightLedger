# MidnightLedger v3.2.4 — Security Review

**Date:** 2026-11-20 (final production-readiness review)
**Baseline:** `2dd6995`
**Scope:** `server.ts` (Express dev/preview + Cloudflare Worker fetch handler), local persistence in `src/context/PaydayContext.tsx` and `src/utils/backup.ts`, import preview UI, Android WebView configuration, static-hosting headers/service worker, CI supply chain.
**Threat model:** The app is a local-first, single-device budgeting tool with no login. Its primary assets are the user's own financial records. Two exposure paths were considered: (a) the optional financial HTTP API, reachable when the dev server or a Worker with D1 is running; (b) malicious/accidental local data (corrupt `localStorage`, crafted backup JSON). Android WebView configuration and CI action provenance were reviewed as additional boundaries.

> Evidence policy: exploitability below is stated only where a live proof-of-concept was executed. Deprecated/defensive observations are labelled as residual risk, not as confirmed exploits.

---

## 1. Confirmed API vulnerabilities (reproduced)

### SEC-01 — Cross-user bill/paycheck overwrite (Critical)

- **Sink (baseline):** `ON CONFLICT(id) DO UPDATE SET …` with no owner predicate.
- **PoC result (baseline, isolated DB):** victim's bill was overwritten by the attacker's payload.
- **Fix:** `saveBill` (`server.ts:199-209`) and `savePaycheck` (`server.ts:211-221`) read the existing row's `user_id` and reject mismatches with `403`; the SQL upserts include owner predicates (`server.ts:34-49`).
- **Post-fix evidence:** attacker POST → `403 {"error":"bill id belongs to another user"}`; victim bill unchanged. Covered by `tests/integration/api.test.ts`.

### SEC-02 — Allocation ownership and relational integrity gap (Critical)

- **PoC result (baseline):** attacker allocation referencing a victim's paycheck and bill was stored and joined to victim data.
- **Fix:** `saveAllocation` (`server.ts:223-241`) verifies both referenced records belong to the caller; upsert predicate (`server.ts:50-59`) blocks re-pointing; deletes are scoped (`server.ts:248-251`); reads join via the caller's paychecks (`server.ts:376`). `migrations/0002_allocation_ownership.sql` backfills `allocations.user_id` from parent paychecks without deleting rows.
- **Post-fix evidence:** attacker allocation → `403`; victim allocation → `200`; attacker delete of victim bill → `200` but no effect.
- **Residual:** the migration assumes parent paychecks carry correct `user_id`; an already-corrupt DB is not auto-repaired (no destructive changes were authorised).

---

## 2. Design-level controls

### SEC-03 — Financial API disabled by default; session auth implemented

- **Finding:** the shipped app never calls `/api/*`. Previously, the Express server exposed all routes by default and relied on a caller-supplied UUID for identity. CORS was already explicitly treated as non-authentication.
- **Control:** `apiGate` returns `503 {"error":"Financial API is disabled. Set ENABLE_FINANCIAL_API=1 to opt in."}` for every non-health API route, including unmatched `/api/*` paths. The Worker returns `503 {"error":"Financial API is disabled."}`. `/api/health` remains public.
- **Authentication:** `apiCore.ts` implements `POST /api/auth/register`, `POST /api/auth/login` and `POST /api/auth/logout`. Passwords are PBKDF2-SHA256 hashes with per-account salts and 100,000 iterations (Workers WebCrypto maximum, stored with each hash); bearer tokens are random 32-byte base64url values and only their SHA-256 hashes are stored. Sessions expire after 24 hours and can be revoked. Identity is derived only from a verified session; `x-user-id` is ignored. There is no shared API secret or frontend-exposed credential.
- **Verified:** health `200`; `/api/bills` and auth routes `503` by default; with opt-in, missing/invalid/expired/revoked token → `401`, `x-user-id` spoofing → `401`, ownership violations → `403`. Attacker bill overwrite and allocation creation were both rejected. Live Worker smoke test on 2026-11-20: health `200`, register `200`, login `200`, authenticated bills `200`, spoofed `x-user-id` `401`, bill create `200`.
- **Deployment (owner-approved):** the Worker is live at `https://midnightledger.justicegraff6.workers.dev` with D1 `midnightledger-db`, migrations `0001`–`0003`, `DB`/`ASSETS` bindings, and `ENABLE_FINANCIAL_API=1` as a Wrangler secret. The throwaway smoke-test account and its data were deleted. The shipped app still makes no network calls.
- **Residual:** registration is open to anyone who knows the Worker URL. Add an invite code or registration allowlist before treating the API as private. The local source default remains disabled.

### SEC-04 — Input validation and injection surface

- Shared validators in `apiCore.ts` normalise all API bodies: cent rounding, bounded money, day-of-month clamping, `sanitizeText` allow-lists, ISO date validation, UUID v4 id validation and typed parsers. Passwords are only accepted at the shared auth boundary.
- All SQL uses bound parameters; the only non-constant table names are the type-restricted literals in `deleteOwned`.
- Rate limiting is in-memory, 100 requests/minute with a bounded map and stale-entry eviction; the Worker keys on `cf-connecting-ip`.
- Origin checks apply only to financial API routes: same-origin requests are always accepted, explicit cross-origin callers must be allowlisted, and static/PWA assets are never blocked by CORS. CORS is not authentication.
- **Residual:** the rate limiter is per-process and does not coordinate across instances or restarts. A no-Origin API request is allowed by design because non-browser clients cannot be authenticated by CORS.

### SEC-05 — Local data boundaries and import safety

- **Corruption handling:** a single `loadStoredState()` (`PaydayContext.tsx:190-219`) distinguishes "no key" (first run → demo sample) from "unreadable key" (empty in-memory ledger, visible `role="alert"` warning at `Toast.tsx:9-23`). `readRawLedger()` (line 212) retains the original bytes for an explicit non-destructive download.
- **Backup validation:** `parseBackup` rejects malformed JSON, unsupported versions and empty/corrupt shapes; `normalizePersistedState` clamps amounts/dates/lengths, caps record counts (`src/utils/backup.ts:24-34,66-79`), and drops `__proto__`/`constructor`/`prototype` keys from map fields. Legacy `paychecks`/`expenses`/`extraCash` keys are accepted.
- **Final review closure — import user-consent gap:** `inspectBackup()` produces a pure preview with record counts and validation warnings; `ImportPreviewModal` requires explicit "Replace my data" confirmation and offers "Download my current data first"; `applyImport()` applies exactly the previewed state. Corrupt backups cannot be confirmed. This closes the residual from the earlier audit; no data is replaced on file selection alone.
- **SEC-06 — Reproduced silent destruction of a corrupt stored value (data-loss risk, fixed):** an E2E regression seeded invalid JSON in `midnightledger_v1` and observed it replaced by an empty-state write on mount; the success path also cleared the corruption warning. **Fix:** `recoveryLocked` (initialised from `initialLoad.corrupt`) makes the persistence effect return early (line 367), preserving the original bytes. The new `RecoveryModal` (`src/components/RecoveryModal.tsx`) requires an explicit choice: restore a backup, download the unreadable bytes, or start fresh. Only `applyImport()` and `startFresh()` unlock persistence. Verified by four E2E scenarios: original preserved on mount/download/cancel; replaced only on explicit restore or fresh start. No financial data is silently overwritten during recovery.
- **Sensitive logging audit:** persistence and notification failures in `src/` now use `safeLog.ts` and emit fixed messages without exception objects or payload fragments. Express and Worker error logs contain only a generic message and a truncated error string — no request bodies, tokens, passwords, user ids or financial values. Startup logging contains only the bound host/port.

---

## 3. Platform / static hosting / CI supply chain

- **Android WebView:** `capacitor.config.ts:5-11` sets `loggingBehavior: 'none'`, `allowMixedContent: false`, `webContentsDebuggingEnabled: false`; `MainActivity.java:11-16` disables file/content access and mixed content.
- **Static hosting:** `public/_headers` applies a strict CSP (`default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`), `nosniff`, `X-Frame-Options: DENY`, `no-referrer`, permissions policy and HSTS. Express now sets the same CSP and baseline security headers in production, with `no-store` on API responses.
- **Service worker:** registered only in production, precaches the app shell, uses network-first navigation with an offline shell fallback, explicitly skips `/api/*` and cross-origin requests, and identifies caches with a SHA-256 content hash of the built `dist/` files stamped by `scripts/stamp-sw.mjs`. Activation deletes only old `midnightledger-app-*` caches, preserving unrelated caches and all persisted user records.
- **CI supply chain (final review closure):** `actions/checkout` and `actions/setup-node` are pinned to reviewed commit SHAs with version comments in `.github/workflows/ci.yml`. `permissions: contents: read`, job timeouts and Node pinning remain in place. No deploy or publish step exists.
- **Residual (HIGH):** `README.md:31` confirms the published APK is debug-signed. A signed release build requires owner approval; exact steps are in `docs/RELEASE.md`. No credentials were created or touched.
- **Residual (MEDIUM):** the local-notifications plugin merges `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` into the release manifest. Owner decision required.

---

## 4. Verification performed

| Check | Result |
|---|---|
| Live PoC against baseline (bill overwrite, allocation ownership gap) | Reproduced before fix |
| Live PoC after fix (403s, unchanged victim data, scoped delete) | Passed |
| Live Worker smoke test (health/register/login/bills/create, spoofed header, cleanup) | Passed after fixing missing `ASSETS` binding and PBKDF2 iteration cap |
| Corrupt-storage overwrite PoC (E2E, before fix) | Reproduced: original replaced by empty-state write |
| Corrupt-storage E2E after fix (mount/download/cancel preserved; explicit restore/fresh replaces) | Passed |
| `npm test` (43 unit + 2 integration) | 45/45 pass |
| Auth unit tests (credential shape, login/session/revocation/expiry, CORS parsing) | Pass |
| Worker unit tests (disabled-by-default, static origin handling, ownership, session spoofing/expiry/logout) | Pass |
| Service-worker unit tests (install, stale-cache cleanup, network-first navigation, no API/cross-origin caching) | Pass |
| `npm run test:e2e` (shell, dark theme, skip link, dialog trap/restore, all six screens mobile+desktop, import preview cancel/corrupt/confirm/export-current, four recovery scenarios) | Pass |
| `npm run lint` (tsc --noEmit) | Pass |
| `npm run build` + `dist/sw.js` stamp check | Pass; stamp `e181761c19bde2bd35e9`, no placeholder |
| `npm audit` | 0 vulnerabilities |

See `TEST_REPORT.md` for exact commands and outputs. No auth service, analytics, cloud sync, or third-party tracking was introduced. `fastlane/metadata/` was not modified.

---

## 5. Security conclusions and approval items

1. The two reproduced cross-user integrity defects are fixed and regression-tested.
2. The financial API is safely inert by default in source and now has session-based identity/authorization in code (item 27 in `IMPROVEMENT_PLAN.md` is Done). With owner-approved OAuth it was deployed to the Worker URL above and verified live. Open registration is the main remaining exposure.
3. Local persistence fails safe (preserve-on-corruption with explicit recovery gating, validated and previewed imports). This claim was previously unverified and is now backed by a reproduced-then-fixed regression test.
4. A signed release APK is still required before the Android artifact can be considered hardened (`docs/RELEASE.md`).
5. Owner decisions remain: merged notification permissions, untracking `dist/`, and removal of speculative Android/CI config.
