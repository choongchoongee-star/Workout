# Google Play release preparation

Updated: 2026-10-23

## App and listing

- App: Steady Sets; package: `com.choongchoongeestar.workout`; initial version: 1.0 (1).
- Play organization account created with developer name Mamkkeot. Identity and mamkkeot.com website ownership are verified. Public developer phone verification is blocked by non-delivery of Google verification calls/SMS to the owner's T Safety Call number; a T world inquiry was submitted. Do not replace the public number with a private mobile number without owner approval.
- Category draft: Health & Fitness. No login, ads, purchases, subscriptions, social features, or user-generated public content.
- Korean and English copy: `google-play-ko-KR.json`, `google-play-en-US.json`.
- `node scripts/google-play-assets.mjs` generates the 512×512 icon and 1024×500 feature graphic in Git-excluded `release-artifacts/google-play/`.
- Optional `captureStoreScreens=true` instrumentation argument captures English workout/history/settings and Korean workout screens from disposable sample records to the app's external files directory. Copy those PNGs out with adb before removing the test app. They are genuine Android screenshots, not iPhone images.
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
- Use the app-specific task `:app:connectedDebugAndroidTest`. The root task also runs dependency-library tests; their generated Cordova test configuration has unrelated Kotlin duplicate-class errors. The app test explicitly grants notification permission for the granted-flow scenario, avoiding permission dialogs after reinstalls; denial is tested separately.
- Emulator verification does not establish manufacturer-specific power-saving behavior or compatibility with every external sharing app. The owner currently has no physical Android phone.
- Before production: public phone verification, Play App Signing setup, final listing/graphics, Data safety/content/health declarations, internal-test install/update with record retention, then review and production release.
- iOS identifier removal, vendor log-retention confirmation, App Privacy changes, and a new native iOS build remain separate pending work. The policy source correction does not change already-installed iOS binaries.

## Official references

- [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Listing graphic requirements](https://support.google.com/googleplay/android-developer/answer/9866151)
- [App signing](https://developer.android.com/studio/publish/app-signing)

## Current submission packet (2026-10-23)

- Android 1.0 (1), package `com.choongchoongeestar.workout`, min SDK 24, target/compile SDK 36. Version code 1 is still for the first Play upload; increment it if a version with that code has already been uploaded.
- Fresh signed AAB SHA-256: `db6132670e6e912a1790de44437ae8e9291952d4fe1e632ac77f1c0a03b1a339`. Built from application source at `44ce96f`; subsequent preparation changes affect listing copy, documentation and test assertions only.
- AAB signature verified; APK v2 signature verified. Archive inspection found no native `.so` libraries and confirmed Android assets contain no LiveUpdate configuration. The packaged LiveUpdate SDK defaults to autoUpdateStrategy `none`, and application OTA requests are gated to iOS.
- Packaged permissions: INTERNET, RECEIVE_BOOT_COMPLETED, WAKE_LOCK, POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM and the app's signature-level DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION. The local notification dependency declares SCHEDULE_EXACT_ALARM; the application does not request exact-alarm special access. This is distinct from USE_EXACT_ALARM.
- Android lint: 0 errors, 34 warnings. JavaScript unit tests: 74 passed. Korean/English SSR assertions now check the current inline numeric inputs. Android instrumentation now checks those inputs and the actual copy-workout dialog instead of the retired numeric-edit dialog.
- Korean/English listing text now includes copying previous workouts, history-based equipment defaults and inline weight/rep editing. Title, short description, full description and release notes fit 30/80/4000/500-character limits.
- Android 16 dedicated-emulator instrumentation passed for both notification-granted and notification-denied flows. Storage/restart restore, backup round trip, background notification delivery/cancellation, keyboard/dialog back navigation and language switching passed. Four fresh sample-record screenshots were captured and visually reviewed. Physical-device and Play-delivered installation remain unverified.
- Regenerated 512x512 icon and 1024x500 feature graphic are in `release-artifacts/google-play/` (not tracked).

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
