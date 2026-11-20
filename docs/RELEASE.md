# Release guide

This document records the **current** release configuration and the exact steps for a
future signed Android release. Nothing here has been executed. A signed release APK
requires an owner-provided keystore and explicit approval; no signing credentials have
been created, published, or overwritten.

## Current state (v3.2.4)

| Item | Value | Source |
| --- | --- | --- |
| Package / application id | `com.midnightledger.app` | `android/app/build.gradle:4,7`; `capacitor.config.ts:4`; `MainActivity.java:1` |
| `versionCode` | `12` | `android/app/build.gradle:10` |
| `versionName` / npm version | `3.2.4` | `android/app/build.gradle:11`; `package.json:3`; `CHANGELOG.md:5` |
| minSdk / targetSdk / compileSdk | `24` / `36` / `36` | `android/variables.gradle:2-4` |
| Signing | **None** — release build type has no `signingConfig`; shipped APK is debug-signed | `android/app/build.gradle:19-24`; `README.md:31`; `docs/DOWNLOAD.md:5` |
| R8 / minification | Disabled (`minifyEnabled false`) | `android/app/build.gradle:21` |
| Android CI job | None | `.github/workflows/ci.yml` (web/Node jobs only) |

The published `v3.2.4` release tag points at a **debug-signed** APK. The "released"
wording in `CHANGELOG.md` and the release badge therefore refer to a sideloadable debug
artifact, not a production-signed one. Reconcile that messaging before any store listing.

## Manifest / privacy configuration

- `android:allowBackup="false"` and no explicit `debuggable` (`android/app/src/main/AndroidManifest.xml:5`).
- App-declared permission is only `INTERNET` (normal, not dangerous) — `AndroidManifest.xml:40`.
- `capacitor.config.ts:9-11` sets `allowMixedContent: false`, `webContentsDebuggingEnabled: false`;
  `MainActivity.java:11-16` disables file/content access and all mixed content.
- The `@capacitor/local-notifications` plugin **merges additional permissions** into the
  release manifest: `POST_NOTIFICATIONS` (dangerous, API 33+), `SCHEDULE_EXACT_ALARM`
  (restricted, API 31+), `RECEIVE_BOOT_COMPLETED`, and `WAKE_LOCK` (source:
  `node_modules/@capacitor/local-notifications/android/src/main/AndroidManifest.xml:26-29`).
  Runtime permission handling exists in `src/utils/notifications.ts:143-145`.
  **Owner decision required:** these contradict the absolute "no permissions / no network"
  wording in `README.md:20,31` and `SECURITY.md`; `SCHEDULE_EXACT_ALARM` is also
  Play-policy sensitive. Confirm the reminder feature is worth these permissions, or
  remove the plugin and its UI.

## Exact release steps (owner action required)

1. **Bump versions together.** Set `versionCode` and `versionName` in
   `android/app/build.gradle:10-11`, the `version` field in `package.json:3`, and add a
   `CHANGELOG.md` entry. `versionCode` must increase for every new APK.
2. **Build the web bundle.**
   ```bash
   npm ci
   npm run lint
   npm test
   npm run build
   ```
3. **Copy web assets into the Android project** (the destination is intentionally
   git-ignored at `.gitignore:44` and `android/.gitignore:95-96`):
   ```bash
   npx cap sync android
   ```
   Verify `android/app/src/main/assets/public/index.html` exists and contains the new
   hashed asset names from `dist/assets/`.
4. **Provide a release keystore (owner only).** There is currently no `signingConfigs`
   block. Only after the owner supplies a keystore and approves, add a `signingConfigs`
   block and a `signingConfig signingConfigs.release` to the `release` build type in
   `android/app/build.gradle`, reading `storeFile`, `storePassword`, `keyAlias`, and
   `keyPassword` from environment variables or an untracked `keystore.properties`.
   Uncomment and use the keystore ignore rules at `android/.gitignore:55-58` so no
   credential is ever committed. **Do not create, publish, or overwrite credentials.**
5. **Build the signed release.** Requires JDK 21 (`android/app/capacitor.build.gradle:5-6`),
   Gradle 8.14.3 (wrapper: `android/gradle/wrapper/gradle-wrapper.properties:3`) and AGP
   8.13.0 (`android/build.gradle:10`):
   ```bash
   cd android && ./gradlew clean assembleRelease
   ```
   Output: `android/app/build/outputs/apk/release/app-release.apk`.
   Consider enabling R8 (`minifyEnabled true`) and adding explicit keep rules in
   `android/app/proguard-rules.pro` (currently boilerplate) for a smaller, reproducible
   artifact.
6. **Verify the artifact** with the manual checklist below, then attach it to the GitHub
   release. Keep the `v3.2.4` tag and note that it is a debug build until step 4-5 are done.

## Manual verification checklist (per release)

- [ ] `applicationId` unchanged (`com.midnightledger.app`) and no package rename.
- [ ] `versionCode` incremented and `versionName` matches `package.json` and `CHANGELOG.md`.
- [ ] APK signature verified: `apksigner verify --print-certs app-release.apk`.
- [ ] Fresh install on a real device: app opens offline, no permission prompt at launch.
- [ ] Existing user data survives an in-place upgrade (do **not** wipe; verify localStorage
      backup via **History → Export JSON** before and after).
- [ ] Notification permission flow (if kept): opt-in works, denial does not break the app.
- [ ] Import preview: cancel, corrupt file, and confirmed import all behave as tested in
      `tests/e2e/smoke.mjs`; excluded occurrences survive round trip.
- [ ] Dark theme, all six tabs, dialogs, charts, empty/error/success states at 390 px and
      desktop widths.
- [ ] Offline: enable airplane mode, confirm full functionality and no console errors.
- [ ] `git status` confirms no signing credential or generated `android/app/build/` output
      is staged.

## Reproducibility / repository hygiene

- `dist/` is git-ignored (`.gitignore:9`) but **12 generated files remain tracked**. They
  are stale and change hash on every build. Proposed, requiring owner approval (not run):
  ```bash
  git rm --cached -r dist
  ```
  This untracks the generated output without deleting the local files or any source asset.
- No tracked `android/app/build/` or `android/build/` output exists; both are correctly
  ignored (`.gitignore:7,42` and `android/.gitignore:24`).
- GitHub Actions are pinned to reviewed commit SHAs in `.github/workflows/ci.yml`.
  CI runs type-check, unit, API integration, dependency audit, web build, and E2E smoke.
  There is no Android build job; adding one requires owner approval and JDK 21 + Android
  SDK provisioning.
- Speculative configuration flagged for owner decision (no changes made):
  Google Services plugin at `android/build.gradle:11` / `android/app/build.gradle:47-54`
  with no Firebase dependency; `wrangler` and `@types/canvas-confetti` dependency placement;
  unused `androidTest` instrumentation dependencies at `android/app/build.gradle:12,40-41`.
