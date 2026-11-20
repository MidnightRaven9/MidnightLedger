# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 3.2.x   | Yes |
| < 3.2   | No — upgrade to the latest release |

## Reporting a vulnerability

Please report security issues privately using
[GitHub Private Vulnerability Reporting](https://github.com/MidnightRaven9/MidnightLedger/security/advisories/new).
Do not open a public issue for an unpatched vulnerability.

Include the affected version, a short description, reproduction steps and the
potential impact. You should receive an acknowledgement within 7 days and a
status update within 30 days. Please give us a reasonable window to release a
fix before public disclosure.

## Threat model

MidnightLedger is an offline-first budgeting app. The Android and PWA builds
keep all data in browser `localStorage` on the user's own device. The app makes
no network requests: there is no account, no telemetry and no server-side
storage in the shipped product. The optional development server and static
demo host exist for contributors and the web demo only.

The optional financial API in `server.ts` and `worker.ts` is disabled by
default. When explicitly enabled with `ENABLE_FINANCIAL_API=1`, identity is
derived only from a verified session: `POST /api/auth/register`,
`POST /api/auth/login`, and `POST /api/auth/logout`. Passwords are stored as
per-account PBKDF2-SHA256 hashes; bearer tokens are random 32-byte values whose
SHA-256 hashes alone are stored. Sessions expire after 24 hours and can be
revoked. A client-supplied `x-user-id` is ignored, and CORS is not
authentication. Password hashes use 100,000 PBKDF2 iterations, the maximum
accepted by Cloudflare Workers' WebCrypto; the count is stored with each hash.
The Worker uses a D1 binding named `DB`, an `ASSETS` binding, and migrations
`0001`–`0003`.

On 2026-11-20, with owner-approved Wrangler OAuth, the Worker was deployed to
`https://midnightledger.justicegraff6.workers.dev` with the D1 database
`midnightledger-db` and `ENABLE_FINANCIAL_API=1` set as a Wrangler secret. Health,
registration, login, authenticated reads/writes and `x-user-id` rejection were
verified live; the throwaway test account was removed. **Registration is open to
anyone who knows the URL.** Add an invite code or registration allowlist before
treating the API as private.

## Data storage

Android builds set `android:allowBackup="false"`, so financial data is not
copied into cloud backups or device-to-device transfers by the operating
system. Clearing app data or uninstalling permanently removes it.
