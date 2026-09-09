# Steady Sets release preparation

Updated: 2026-09-09

## Current review status (2026-09-09)

- Submitted iOS 1.0 (10) to App Review with explicit owner authorization at 11:02 KST on 2026-09-09. Submission ede9102a-25ef-40bf-a5eb-3938f352c092 is Waiting for Review, verified on its details page. Required-field validation passed. Manual release remains enabled; the app has not been released. Previous preparation entries below are historical.

- Production build 10 succeeded: 3e5bd2ce-0ef6-45d9-a2bf-ca2ccc5d3293, source base 304735f, runtime ios-df63450d92c09d12. The downloaded IPA contains app/widget version 10 and both en/ko InfoPlist.strings resources. App Store Connect upload succeeded (submission 4415d835-b36c-4853-9f98-0fddcb2e704c). Apple processing is complete: validated, English and Korean listed. Build 10 is selected and saved for iOS 1.0, verified by reopening the page. Earlier failed-build notes below are historical.

- Build 7 is processed and selected in ASC; the owner completed real-device testing. The build metadata lists English only despite working in-app Korean/English.
- App and widget now have en/ko InfoPlist.strings resources connected to their Resources phases. Local graph validation, 60 unit tests, bilingual SSR, browser flows (26 persisted-state checkpoints), lint, web build and Capacitor sync passed. Native compilation and IPA/ASC language verification require the next approved build.
- New prepared runtime: ios-df63450d92c09d12. Build 8 was attempted and failed before archive; no IPA was produced. Remote version validation now runs after EAS synchronizes app/extension versions. Local reproduction and checks passed; no retry has been started.
- Mac and Apple Vision Pro distribution are disabled. Free worldwide availability and manual release remain selected. Korean storefront copy is separate from binary language support and has not been added.
- Earlier dated entries below are historical; formal review and final release remain on hold.

## Verified and prepared

- Owner reports real-device testing complete. This is owner confirmation, not an additional automated device test.
- Final name: Steady Sets. Exact-name public web/App Store searches found no matching workout app; the related name Steady is used by another workout tracker. Search is not a trademark clearance or a guarantee that Apple will accept the name.
- English store copy is in metadata-en-US.json. Name, subtitle, promotional text, keywords and description fit Apple's field limits.
- Existing app record: 6808960698; keep bundle ID com.choongchoongeestar.workout.
- Build 5 was uploaded to TestFlight. The final name and icon require the next native build.
- Screenshots are supplied separately by the owner.

## Saved in App Store Connect

- Steady Sets / Simple Workout Log saved; reloaded app menu displays Steady Sets without a name-conflict error. This is not trademark clearance.
- Primary category: Health & Fitness.
- English promotional text, description, keywords, support/marketing URLs and review notes saved from metadata-en-US.json.
- Privacy policy URL saved and visible on App Privacy page.
- Login required disabled; manual release selected and saved.
- Age questionnaire saved: no mature content, ads, social/chat, gambling, contests or unrestricted browsing; no medical/treatment information, health/wellness topics present. Apple computed 9+ in 172 regions, all ages in Korea and 12+ in Vietnam. No age override selected.

## Remaining App Store Connect actions

- Review contact saved on 2026-09-08 with owner-provided first/last name, phone and email; reload confirmed the saved form. Private values are excluded from this repository. Copyright saved and reloaded: 2026 Choonghyun Han. Public support continues to use the GitHub issue link; the review email is not automatically a public support address.
- All 175 countries/regions and future territories are enabled for availability after release. Free pricing saved on 2026-09-08 by owner request; current USD price verified as USD 0.00, with worldwide zero prices confirmed.
- App Privacy published on 2026-09-08: Other Data Types, App Functionality, linked to user, not used for tracking. GitHub Pages explicitly retains visitor IP addresses for security; this is disclosed as security-related network data, not workout collection. No pre-collection anonymization is documented, so the label does not claim unlinked data. Apple includes security in App Functionality. After execution-time owner confirmation of the accuracy/legal-compliance/update-obligation agreement, the final Publish action succeeded and ASC displayed the recent publication timestamp. App review submission and final release are explicitly on hold.
- Content rights saved: no third-party content. Existing Apple standard EULA and non-trader status are preserved.
- After explicit owner confirmation, No was saved for regulated medical device status; ASC confirms the app is not a regulated medical device in any country/region.
- Eight 1242×2688 PNG screenshots are uploaded for English (US), iPhone 6.5-inch: two panoramic hero cards, then workout detail, history, exercise search, preferences, backup, and start. All designs use the supplied original PNGs. Order steady-sets-01.png through steady-sets-08.png and the eight-image count were verified after reload on 2026-09-08. Source screenshots remain outside Git. No final build selected. Production iOS build 6 containing the final name/icon was uploaded to EAS on 2026-09-08: 046c1f3b-3ad3-4a7c-a3ef-62aa785bd6f2. Apple interactive authentication and both target signing checks passed. Build FINISHED and IPA creation verified. App Store Connect upload succeeded on 2026-09-08 (submission 9bf5b2d5-bcca-41c6-9ba4-93777b35403c). Apple processing completion remains unverified; formal review submission and release remain on hold.
- Check any region-specific declarations shown by Apple once countries are selected. Do not accept legal agreements or invent business/trader information.

## Sources

- https://developer.apple.com/app-store/app-privacy-details/
- https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
- https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/
- https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
- Related workout app: https://steady.rocks/

- GitHub Pages IP retention: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection

## Build 7: Korean and English

- Source now supports iOS per-app Preferred Language (en/ko), without an in-app selector. Build 6 does not include this change.
- Native runtime: ios-f732ac7ea13239d4. Existing backup formats and equipment keys are preserved.
- Approved production build 7 finished on 2026-09-08; IPA generated. EAS build: 951b90dd-680f-43e3-81e5-641cfcbe5926. App Store Connect upload succeeded on 2026-09-08 (submission 518375b8-5bba-4de5-bcd5-8eed8cbe9766). Apple processing completion and device verification remain pending. Formal review submission and release remain on hold.

- Extended local verification passed: 60 unit tests, bilingual SSR, browser input/persistence/export/import/delete flows, locale switching, and 320–430px layouts. No functional failure reproduced within this scope. Actual iPhone language settings and ActivityKit rendering still require testing with build 7.

- Failed build 8: 72f57bb9-e725-4b12-a04e-1fdf36b56062. The pre-version-sync assertion rejected widget 7 versus app 8. Dependency installation, web build and Capacitor sync succeeded. Existing ASC build 7 remains available.

- Build 9 (8a635822-6364-4fda-ae8d-89467e97f3bd) also failed before archive: EAS version configuration left the custom widget at 8 versus app 9. The server successfully verified bundled en/ko resources. Explicit sync-ios-versions.mjs now synchronizes all native configurations before the version gate. Verified against the actual failed checkout and with 62 tests; no further rebuild or submission has run. Current local build number: 9.

- 2026-09-09: Build 10 uploaded successfully to ASC, submission 4415d835-b36c-4853-9f98-0fddcb2e704c. Apple is processing the binary. TestFlight group setup was skipped after an authentication error; this did not prevent successful binary upload. Review build selection, formal review and release were not changed.

- 2026-09-09: Replaced review build 7 with 10, saved and reopened to verify persistence. Apple build ID f6a7c308-aec8-48c9-b0b0-fbbbbca26bba. Metadata confirms Validated and English/Korean localizations. Manual release remains enabled; Add for Review and final submission were not invoked.
