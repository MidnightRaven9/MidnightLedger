# Security review

This document records the security posture of MidnightLedger 3.2.4. The
shipped Android and PWA builds store data only in the browser's `localStorage`
on the user's device and make no network requests.

## Application

- React escapes rendered values; the codebase contains no `dangerouslySetInnerHTML`,
  `innerHTML`, `eval` or `new Function` sinks.
- User-entered names are bounded in length in the UI and validated server-side
  by `sanitizeText`.
- Financial values are parsed through bounded numeric helpers. Non-finite,
  negative and out-of-range values are rejected rather than propagated into
  calculations.
- Dates are handled via explicit ISO parsing/formatting helpers to avoid
  timezone rollover.
- The notification system computes reminders locally and never transmits data.
- Android sets `allowBackup="false"`; local data is not copied into cloud
  backups by the OS.

## Development server and Worker

`server.ts` is used by `npm run dev`, `npm start` and the optional static demo.
It is not part of the offline app build.

- All SQL statements use bound parameters.
- Financial routes derive the user id only from a verified, unexpired,
  unrevoked session token. `x-user-id` is ignored; CORS is not authentication.
- Registration, login and logout are gated by `ENABLE_FINANCIAL_API=1`. Password
  hashes use PBKDF2-SHA256 with per-account salts and 100,000 iterations (the
  Workers WebCrypto maximum, stored with each hash); only SHA-256 hashes of
  opaque 32-byte bearer tokens are persisted.
- Request bodies must be JSON objects. Amounts, dates, IDs and day-of-month
  values are validated and clamped before persistence.
- In-memory rate limiting is capped at 100 requests per minute per IP, with a
  bounded bucket map and eviction of stale/oldest entries.
- CORS uses an explicit origin allowlist; no wildcard is honoured. Responses
  include `Vary: Origin`.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`) are set on server responses. Static hosting on Cloudflare
  is responsible for its own headers.
- Logs redact user IDs and never include request bodies.

## Dependencies

`npm audit` reports zero known vulnerabilities for the current lockfile.

## Known limitations

- The financial API remains disabled by default in source and local
  configuration. On 2026-11-20 it was deployed with owner-approved OAuth to
  `https://midnightledger.justicegraff6.workers.dev` using D1 `midnightledger-db`,
  migrations `0001`–`0003`, `ASSETS` and `DB` bindings, and
  `ENABLE_FINANCIAL_API=1` as a Wrangler secret. Live smoke tests passed and the
  throwaway account was deleted.
- **Registration is currently open to anyone who knows the Worker URL.** Add an
  invite code or registration allowlist before treating the API as private. No
  `ALLOWED_ORIGINS` secret is set; same-origin requests work and unknown
  cross-origin callers are rejected.
- The rate limiter is process-local; a multi-instance deployment needs a shared
  limiter at the edge.
- `localStorage` is readable by any script executing on the same origin. Keep
  third-party scripts out of the app shell.
