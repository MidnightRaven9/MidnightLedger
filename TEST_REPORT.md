# MidnightLedger v3.2.4 — Test Report

**Date:** 2026-11-20 (final production-readiness review)
**Baseline:** `2dd6995`
**Environment:** Node 22 (`.nvmrc`), local isolated temp DBs, Playwright Chromium (bundled).
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
| `tests/unit/calculations.test.ts` | `roundCents`, `getMyShare`, `getFullTotal`, `calcNet`, invalid inputs |
| `tests/unit/backup.test.ts` | round-trip (incl. `excludedOccurrences`), legacy keys, malformed/unsupported/empty rejection, unsafe-map-key stripping, clamping, record cap, **clean-warning check, `inspectBackup` counts/warnings/rejection, preview–parse equivalence** |
| `tests/unit/accentColor.test.ts` | **new:** WCAG contrast selection for eight accent colours |
| `tests/unit/dateUtils.test.ts` | leap dates, invalid ISO dates, month-end addDays, parse/format round-trip |
| `tests/unit/paydayLogic.test.ts` | summary/leftover cent consistency, excluded occurrences, projection boundaries |
| `tests/integration/api.test.ts` | API disabled-by-default gating; opt-in 401; cross-user overwrite 403; rounding; allocation ownership 403/200; scoped delete |
| `tests/e2e/smoke.mjs` | shell, dark theme, skip link, dialog focus trap/restoration, **all six screens at mobile+desktop widths**, **import preview cancel/corrupt/confirm/export-current**, and **four explicit-recovery data-safety scenarios** (corrupt bytes preserved on mount/download/cancel, replaced only by explicit backup restore or fresh start), no page errors |

---

## 2. Executed results (final review)

### Full suite — `npm test`

```
ℹ tests 27
ℹ suites 0
ℹ pass 27
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 13181
```

Breakdown: 25 unit + 2 integration. Representative passing lines include the five new backup-preview tests, two new contrast tests, and both API gating/ownership integration tests.

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
✓ 2130 modules transformed
✓ built in 29.70s
build/server.cjs      21.1kb
build/server.cjs.map  37.6kb
```

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
| Money math | unit tests for rounding, splits, net, summaries | exhaustive property/fuzz testing |
| Backup/import | round-trip, legacy, malformed, caps, unsafe keys, preview counts/warnings, corrupt/cancel/confirm/export-current E2E | real OS file-picker dialogs |
| Corrupt-storage recovery | reproduced silent overwrite; E2E proves original bytes survive mount, download and cancel, and are replaced only by explicit backup restore or fresh start | corrupt data under a legacy key (code path preserved via `readRawLedger`), physical device storage corruption |
| Accessibility | E2E focus trap, skip link, nav, all screens mobile+desktop; static label/role/contrast audit | physical VoiceOver/TalkBack session |
| Dates | leap/month-end/ISO validation | timezone-specific environments beyond local noon |
| API security | integration tests for gating, 401, 403, rounding, scoped delete | multi-instance rate-limit coordination, real auth (out of scope) |
| Android | config reviewed and documented | on-device runtime test, signed release build |
| CI supply chain | action SHAs pinned, permissions restricted | Android build job (owner decision) |

All executed checks pass. Remaining gaps and approval items are recorded in `IMPROVEMENT_PLAN.md` and the accompanying review documents.
