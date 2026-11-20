# MidnightLedger v3.2.4 — Test Report

**Date:** 2026-11-20 (final production-readiness review)
**Baseline:** `2dd6995`
**Environment:** Node v24.22.2 locally (project pins Node 22 in `.nvmrc`), local isolated temp SQLite DBs, in-memory D1 adapter, Playwright Chromium (bundled).
**Principle:** every result below was executed independently; no test result is assumed. All commands ran from `/root/projects/MidnightLedger`.

---

## 1. Test infrastructure

No new test dependency was added. Tests use Node's built-in `node:test` runner via `tsx` (`node --import tsx --test …`). Scripts in `package.json`:

| Script | Command |
|---|---|
| `npm test` | `node --import tsx --test tests/unit/*.test.ts tests/integration/*.test.ts` |
| `npm run test:unit` | `node --import tsx --test tests/unit/*.test.ts` |
| `npm run test:integration` | `node --import tsx --test tests/integration/*.test.ts` |
| `npm run test:e2e` | `node tests/e2e/smoke.mjs` (requires `npm run build` first) |

Test files:

| File | Coverage |
|---|---|
| `tests/unit/calculations.test.ts` | shared cent rounding (incl. `1.005`, negatives, large values), `sumMoney`, `getMyShare` even/custom/percentage/legacy splits, `getFullTotal`, `calcNet`, invalid inputs |
| `tests/unit/backup.test.ts` | round-trip (incl. `excludedOccurrences` and split fields), legacy keys, malformed/unsupported/empty rejection, unsafe-map-key stripping, clamping, record cap, `inspectBackup` counts/warnings/rejection |
| `tests/unit/auth.test.ts` | **new:** registration shape/duplicates, login/session/revocation/expiry, CORS origin parsing |
| `tests/unit/worker.test.ts` | **new:** disabled-by-default, static asset origin handling, session-only ownership, spoofing/expiry/logout |
| `tests/unit/serviceWorker.test.ts` | **new:** build-stamped cache install, stale-cache cleanup, network-first navigation, offline shell, no API/cross-origin caching |
| `tests/unit/accentColor.test.ts` | WCAG contrast selection for eight accent colours |
| `tests/unit/dateUtils.test.ts` | leap dates, invalid ISO dates, month-end addDays, parse/format round-trip |
| `tests/unit/paydayLogic.test.ts` | summary/leftover cent consistency, excluded occurrences, projection boundaries |
| `tests/integration/api.test.ts` | API/auth disabled-by-default gating, health/CORS behavior, opt-in session 401s, cross-user overwrite 403, rounding, allocation ownership 403/200, scoped delete, logout with/without body |
| `tests/e2e/smoke.mjs` | shell, dark theme, skip link, dialog focus trap/restoration, **all six screens at mobile+desktop widths**, **import preview cancel/corrupt/confirm/export-current**, and **four explicit-recovery data-safety scenarios** (corrupt bytes preserved on mount/download/cancel, replaced only by explicit backup restore or fresh start), no page errors |

---

## 2. Executed results (final review)

### Full suite — `npm test`

```
ℹ tests 45
ℹ suites 0
ℹ pass 45
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8100
```

Breakdown: 43 unit + 2 integration. New coverage includes auth registration/login/revocation/expiry, password hashes staying within Workers' 100,000-iteration PBKDF2 cap with legacy verification, Worker disabled-by-default and ownership, service-worker cache/update behavior, shared cent rounding and split preservation. Both Express integration tests pass, including API disabled-by-default, missing/invalid session rejection, `x-user-id` spoofing rejection, and attacker write attempts returning `403`.

### New auth / Worker / service-worker tests

Representative passing lines:

```
✔ password hashes stay within Worker WebCrypto limits and verify legacy hashes
✔ registration enforces credential shape and does not allow duplicates
✔ sessions are derived from verified credentials and can be revoked
✔ expired session tokens are rejected
✔ Worker keeps financial and auth routes disabled by default
✔ Worker serves static assets broadly but restricts cross-origin API calls
✔ Worker derives ownership from a verified session, not client headers
✔ service worker install precaches the app shell with a build-stamped cache
✔ navigation is network-first and falls back to the cached app shell offline
✔ assets are cached, API traffic is never cached, and cross-origin requests are ignored
```

### New backup-preview tests

```
✔ clean backups parse with no validation warnings
✔ inspectBackup reports record counts, warnings and excluded occurrences for the preview
✔ inspectBackup rejects corrupt or unsupported backups without producing state
✔ import round trip preserves excluded occurrences through preview and parse
✔ oversized backups are limited to supported record counts (with warning assertion)
```

### E2E — `npm run build && npm run test:e2e`

Build passed:
```
✓ 2133 modules transformed
✓ built in 37.03s
Stamped service worker cache with e181761c19bde2bd35e9
build/server.cjs      28.3kb
build/server.cjs.map  52.7kb
```

`dist/sw.js` was checked after the build: `CACHE_NAME = midnightledger-app-e181761c19bde2bd35e9`, with no `__BUILD_ID__` placeholder remaining. Tracked `dist/` files were then restored with `git checkout -- dist`.

E2E passed:
```
E2E smoke passed: shell, dark theme, skip link, dialog focus trap/restoration, all six screens at mobile+desktop widths, import preview cancel/corrupt/confirm/export-current, corrupted ledger preserved with explicit recovery (download/cancel/backup/fresh).
```

The test starts the production server on `127.0.0.1:3933`, opens a 390×844 Chromium page, sweeps all six tabs at mobile and 1280×800 desktop widths, exercises the import preview (valid preview counts, **export-current download with JSON structure assertions and preview left open**, cancel with no data change, corrupt backup with replace disabled, confirmed import applying the previewed bill), and closes both browser and server in `finally`. Zero page errors were recorded.

#### Critical data-safety reproduction and recovery regression

Before the fix, a regression scenario seeded `midnightledger_v1` with `CORRUPTED_ORIGINAL_DO_NOT_LOSE` via `addInitScript`, loaded the app, and asserted the value was still present. It **failed**, showing the original had been replaced by an empty-state JSON write (`{"schedule":…,"paydays":[],"bills":[],…}`). This reproduced the suspected silent-overwrite path. After the fix, four isolated browser contexts (each with the corrupt seed) pass:

| Scenario | Assertion |
|---|---|
| A — mount + download | Recovery `alertdialog` shown; original bytes preserved; "Download the unreadable data" yields `midnightledger-unreadable-data.txt` whose contents equal the original; storage unchanged |
| B — backup preview + cancel | Preview opens (with the empty-ledger export button hidden), Cancel returns to recovery options; original bytes unchanged; no imported bill rendered |
| C — backup restore | Explicit "Replace my data" closes recovery; imported bill rendered on History; persisted value now contains the imported bill |
| D — start fresh | Explicit "Start fresh with an empty ledger" closes recovery; persisted value is an empty ledger (`"paydays":[]`) |

No page errors were recorded in any of the four contexts. This proves no financial data is silently overwritten during recovery.

### Live Worker deployment smoke test (owner-approved OAuth)

On 2026-11-20 the Worker was deployed to `https://midnightledger.justicegraff6.workers.dev` with D1 `midnightledger-db`, migrations `0001`–`0003`, `DB`/`ASSETS` bindings and `ENABLE_FINANCIAL_API=1` as a Wrangler secret. The first live smoke test exposed two defects that local tests could not:

| Defect | Evidence | Fix |
|---|---|---|
| `env.ASSETS` undefined → health `500` (Cloudflare error 1101) | `wrangler tail`: `TypeError: Cannot read properties of undefined (reading 'fetch')` at `worker.ts:44` | Added `"binding": "ASSETS"` to `wrangler.jsonc`; made Worker `/api/health` return its own JSON instead of proxying to assets |
| PBKDF2 310,000 iterations rejected by Workers WebCrypto → register `500` | `wrangler tail`: `Pbkdf2 failed: iteration counts above 100000 are not supported (requested 310000)` | Lowered new hashes to 100,000 iterations with the count stored per hash; added a regression test |

After redeploy, the live results were:

```text
health=200 register=200 login=200 bills=200 spoofed_x_user_id=401 create=200
health_body={"status":"ok","time":"2026-11-20T07:13:38.330Z"}
bills_body=[]
```

No token, password or Cloudflare credential was printed or stored. The throwaway account and its bill were removed from D1 with a scoped cleanup script; a follow-up query confirmed `users=0, sessions=0, bills=0, smoke_users=0`.

### Type check — `npm run lint`

```
> tsc --noEmit
```
Exit 0, no output.

### Dependency audit — `npm audit --audit-level=high`

```
found 0 vulnerabilities
```

---

## 3. CI wiring

`.github/workflows/ci.yml` runs on push/PR to `main` with `permissions: contents: read` and job timeouts. Two jobs:

- **build:** `npm ci --ignore-scripts` → `npm rebuild esbuild @esbuild/linux-x64` → `npm run lint` → `npm run test:unit` → `npm run test:integration` → `npm audit --audit-level=high` → `npm run build`.
- **e2e:** install deps + rebuild → `npx playwright install --with-deps chromium` → `npm run build` → `npm run test:e2e`.

Node version comes from `.nvmrc` (`22`). Actions are pinned to reviewed commit SHAs:
- `actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4`
- `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4`

There is no Android build job (owner approval required; see `docs/RELEASE.md`).

---

## 4. Build-output (`dist/`) handling

`dist/` is git-ignored but 12 generated files remain tracked. Each `npm run build` regenerates hashed chunks, deleting/modifying the tracked files. After every verification build the tracked `dist/` files were restored to their committed state (`git checkout -- dist`) so the repository stays self-consistent; no generated output was committed. Fully untracking `dist/` requires owner approval (proposal: `git rm --cached -r dist`). Production releases must rebuild `dist/` first.

---

## 5. Coverage summary and gaps

| Area | Covered | Not covered |
|---|---|---|
| Money math and splits | unit tests for shared rounding, integer-cent sums, custom/percentage/even/legacy splits, net, summaries | exhaustive property/fuzz testing |
| Backup/import | round-trip incl. split fields, legacy, malformed, caps, unsafe keys, preview counts/warnings, corrupt/cancel/confirm/export-current E2E | real OS file-picker dialogs |
| Corrupt-storage recovery | reproduced silent overwrite; E2E proves original bytes survive mount, download and cancel, and are replaced only by explicit backup restore or fresh start | corrupt data under a legacy key (code path preserved via `readRawLedger`), physical device storage corruption |
| Accessibility | E2E focus trap, skip link, nav, all screens mobile+desktop; static label/role/contrast audit | physical VoiceOver/TalkBack session |
| Dates | leap/month-end/ISO validation | timezone-specific environments beyond local noon |
| API security/auth | unit + integration tests for disabled-by-default gating, session login/revocation/expiry, `x-user-id` spoofing, ownership, CORS/static behavior, rounding, scoped delete | multi-instance rate-limit coordination, real D1 deployment |
| Worker | disabled-by-default, static asset origin handling, session-only ownership, spoofing/expiry/logout, plus live deployed smoke test with D1/ASSETS bindings | registration allowlist/invite code, custom origin allowlist |
| Service worker/PWA | unit tests for build stamp, install, stale-cache cleanup, network-first navigation, no API/cross-origin caching; E2E production shell | physical offline reinstall/update on a device |
| Android | config reviewed and documented | on-device runtime test, signed release build |
| CI supply chain | action SHAs pinned, permissions restricted | Android build job (owner decision) |

All executed checks pass. Remaining gaps and approval items are recorded in `IMPROVEMENT_PLAN.md` and the accompanying review documents.
