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
- `x-user-id` must be a syntactically valid UUID v4 and scopes every query.
  It is a partition key, not authentication — see `SECURITY.md`.
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

- Anyone who knows a user's UUID can access that user's partition on a hosted
  deployment because there is no authentication layer.
- The rate limiter is process-local; a multi-instance deployment needs a shared
  limiter at the edge.
- `localStorage` is readable by any script executing on the same origin. Keep
  third-party scripts out of the app shell.
