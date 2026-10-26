# Google Play release preparation

Updated: 2026-10-26

## App and listing

- App: Steady Sets; package: `com.choongchoongeestar.workout`; initial version: 1.0 (1).
- Play organization account created with developer name Mamkkeot. Identity and mamkkeot.com website ownership are verified. Public developer phone verification is blocked by non-delivery of Google verification calls/SMS to the owner's T Safety Call number; a T world inquiry was submitted. Do not replace the public number with a private mobile number without owner approval.
- Category draft: Health & Fitness. No login, ads, purchases, subscriptions, social features, or user-generated public content.
- Korean and English copy: `google-play-ko-KR.json`, `google-play-en-US.json`.
- `node scripts/google-play-assets.mjs` generates the 512×512 icon and 1024×500 feature graphic in Git-excluded `release-artifacts/google-play/`.
- Optional `captureStoreScreens=true` instrumentation argument captures workout/history/exercise history/settings screens in both English and Korean from disposable sample records to the app's external files directory. Copy those PNGs out with adb before removing the test app. They are genuine Android screenshots, not iPhone images.
- Public support email: `support@mamkkeot.com`; owner confirmed the mailbox can receive support inquiries on 2026-10-23.
- Privacy URL: https://choongchoongee-star.github.io/Workout/privacy/ . Owner approved publication on 2026-10-23. The shared policy identifies Mamkkeot, support@mamkkeot.com and the effective date October 23, 2026, and distinguishes actual Android/iOS update behavior within one document. Published only privacy/index.html; existing OTA files preserved.
- Content-rating and health-app declarations must be completed in Play Console using the actual workout-log functionality. Do not copy Apple's computed age rating or claim medical functionality. No Health Connect integration.

## Android Data safety draft

For the current Android implementation only:

- Workout records, exercise library, preferences, and rest timers are processed/stored on device; no developer backend receives them.
- No account, analytics, ads, remote push, location collection, or automatic OTA download. Android updates are distributed through Google Play.
- User-selected Markdown export opens the system share sheet. This is a user-initiated transfer to the user's chosen destination; the developer does not receive a copy. Evaluate Google's user-initiated sharing exception when completing the form.
- Proposed collected/shared user-data answers: **No**, subject to final packaged-SDK review and the actual Play form. Do not copy the iOS privacy label: the iOS OTA component sends a vendor identifier and GitHub handles request IPs.
- External support/privacy links open third-party websites; those services process normal web requests. A visit to the public website is distinct from automatic collection by the Android app.
- Android cloud backup is disabled in the manifest and extraction rules. Users must export before uninstalling or moving devices.

## Signing and reproducible builds

Run from PowerShell 7 with JDK 21 and Android SDK configured:

```powershell
./scripts/android-release.ps1 -CreateKey # exactly once on a new setup
./scripts/android-release.ps1            # reuse the existing key thereafter
```

The helper refuses to overwrite a key, generates a 3072-bit RSA upload key with a 10000-day validity, uses process environment variables for Gradle secrets, restores prior variables afterwards, builds signed AAB/APK and verifies the AAB signature. The key is in `.android-signing/upload.jks`; the password is protected with Windows DPAPI in `.android-signing/password.dpapi`. Both are excluded from Git, as are release artifacts. The public upload certificate is exported to `.android-signing/upload-certificate.pem`.

**Backup remains an owner action:** DPAPI is tied to the current Windows user/profile. Copying only `password.dpapi` to another computer is not a portable backup. Store the key and recovered password in a secure password manager/off-device backup before uploading to Play. Do not regenerate the key after first upload. No password is printed by the build helper.

- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- Signed APK for local checks: `android/app/build/outputs/apk/release/app-release.apk`
- Play App Signing's distribution key can differ from this upload key. Local APK upgrade tests do not replace a Play-delivered install/update test.

## Verification and remaining gates

- 2026-09-16: 65 unit tests, lint, web build, bilingual SSR, site build and local iOS configuration checks passed. Android 16 native granted-flow and denied-flow instrumentation passed after making permission/locale setup deterministic. Four sample-record screenshots were captured. Signed release APK install, reinstall and rendered startup were verified. AAB signature and APK v2 signature verified.
- Upload certificate SHA-256: `f512a7565d0264c0e2df585bd40ef1f1f3abaec2681da4194d83cb7540d96288`.
- Historical 2026-09-16 AAB SHA-256: `6fcee0b7b88dc2eab2cbfbdc536d2d78667709b114fc4d79808a7dde4dbfaaaa`.

- Existing native instrumentation covers on-device files, restart restore, equipment/rep changes, pending notification cancellation, background alert delivery and sound configuration, actual FileProvider export URI and import (external picker/share receiver simulated), duplicate import protection, keyboard/dialog/back navigation, and English/Korean rendering.
- Run only on the dedicated disposable emulator with `allowFixtureReset=true`; it replaces fixture data. Never run against a user's phone.
- Select `AndroidRuntimeTest#nativeStorageTimerBackupAndLanguage` explicitly with `allowFixtureReset=true` for the main flow; edge-case methods require separate fixture setup and flags. Do not run the whole class indiscriminately. Release instrumentation requires the test APK to use the same signing key. Use app-specific instrumentation. The root task also runs dependency-library tests; their generated Cordova test configuration has unrelated Kotlin duplicate-class errors. The app test explicitly grants notification permission for the granted-flow scenario, avoiding permission dialogs after reinstalls; denial is tested separately.
- Emulator verification does not establish manufacturer-specific power-saving behavior or compatibility with every external sharing app. The owner currently has no physical Android phone.
- Before production: public phone verification, Play App Signing setup, final listing/graphics, Data safety/content/health declarations, internal-test install/update with record retention, then review and production release.
- iOS identifier removal, vendor log-retention confirmation, App Privacy changes, and a new native iOS build remain separate pending work. The policy source correction does not change already-installed iOS binaries.

## Official references

- [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Listing graphic requirements](https://support.google.com/googleplay/android-developer/answer/9866151)
- [App signing](https://developer.android.com/studio/publish/app-signing)

## Current submission packet (2026-10-26)

- Android 1.0 (1), package com.choongchoongeestar.workout, min SDK 24, target/compile SDK 36. Version code 1 is for the first Play upload; increment if already used.
- AAB SHA-256: 1792b16dc6e21c0ad87013b8d973589eb833dfcd67c56893d06289b849cca5fb.
- APK SHA-256: ff5a6c9956f0cd541e5d0a66e146d7bacdacf9336640fe1b118fa2e7661da42d.
- Includes source c9224c7 (immediate-save journal and large-font fixes) plus this preparation's manifest permission removal. Supersedes the October 23 binary. Packet: release-artifacts/google-play/2026-10-26/ (Git-excluded).
- Existing upload key reused; AAB and APK v2 signatures verified. No native .so libraries or Android LiveUpdate configuration. All 15 embedded web asset files match between AAB and APK; the native journal class is present. OTA requests remain iOS-only.
- Packaged permissions: INTERNET, RECEIVE_BOOT_COMPLETED, WAKE_LOCK, POST_NOTIFICATIONS and the app's signature-level DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION. Removed dependency-inherited SCHEDULE_EXACT_ALARM because the app uses inexact rest alerts. Neither exact-alarm permission remains.
- Final signed release APK passed the main Android 16 emulator flow: storage/restart restore, backup round trip, background alerts/cancellation, keyboard/dialog back navigation and language switching. Earlier debug tests covered denied notifications, immediate process termination and large fonts; those were not all rerun on this release APK. Physical-device and Play-delivered install/update remain unverified.
- Eight fresh sample-record screenshots (four per language), 1080×1920 RGB PNG, visually reviewed. Includes regenerated 512×512 icon and 1024×500 feature graphic. No private workout records are included.
- 79 JavaScript tests, lint and web build passed. Android lint: 0 errors, 34 warnings.
- Both listings fit title/short/full/release-note limits of 30/80/4000/500 characters. Full descriptions now state the app is not a medical device, makes no diagnosis/treatment/cure/prevention claims and advises consulting a healthcare professional for medical advice, diagnosis or treatment.
- Public privacy URL returned HTTP 200; Mamkkeot, support email, Android behavior and October 23 effective date verified.
- [Health apps policy](https://support.google.com/googleplay/android-developer/answer/16679511) and [target audience guidance](https://support.google.com/googleplay/android-developer/answer/9867159) inform the submission draft. Audience remains pending owner confirmation; 13+ is recommended if teens and adults are the intended users. Public content ratings do not disclose other apps' target-audience selections.

### Console answers to prepare

| Item | Draft answer / gate |
| --- | --- |
| App name / kind / category | Steady Sets / App / Health & Fitness |
| Price | Free; no in-app purchases or subscriptions |
| App access | All functionality available without login or credentials |
| Ads | No ads |
| Health declaration | Activity and fitness; workout recording, not diagnosis or treatment; no Health Connect |
| Data safety | No collected/shared data proposed; review against packaged SDK behavior and Google's user-initiated sharing exception before submission |
| Account deletion | No user-account creation; records are on device and can be deleted locally |
| Target audience | Owner must choose intended age groups; do not infer from Apple's rating |
| Content rating | Complete IARC questionnaire from actual app behavior; do not copy another store's rating |
| Support | support@mamkkeot.com; owner confirmed mailbox availability on 2026-10-23 |
| Privacy | Shared iOS/Android policy published with owner approval on 2026-10-23 |
| Distribution | South Korea only, confirmed by owner on 2026-10-23; launch timing pending |
| Testing | Upload to internal testing after account setup; verify Play-delivered install/update and record retention |

No Play app, listing, declaration, upload, review submission or production release was created by this local preparation. No EAS operation is needed for the local Android build.

On 2026-10-23, clicking Create app showed: Complete account verifications to create apps. App creation and subsequent Console setup are blocked until the remaining phone verification is completed. The privacy correction uses one shared policy URL with platform-specific behavior explained inside; separate market policies are not planned. Owner approved and the shared policy was published on 2026-10-23.
