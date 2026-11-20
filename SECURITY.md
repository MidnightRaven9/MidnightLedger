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

The API in `server.ts` uses an `x-user-id` UUID as a data-partition key. It is
**not authentication**: anyone who knows a UUID can read that partition. Never
store sensitive data in a hosted deployment without adding real authentication
in front of it.

## Data storage

Android builds set `android:allowBackup="false"`, so financial data is not
copied into cloud backups or device-to-device transfers by the operating
system. Clearing app data or uninstalling permanently removes it.
