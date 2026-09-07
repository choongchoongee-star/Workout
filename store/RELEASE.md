# Steady Sets release preparation

Updated: 2026-09-07

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

- Review contact fields and copyright are blank. Request owner details privately; do not commit contact details. Public support currently uses the GitHub issue link; a support email awaits the owner.
- Pricing and country selection await the owner's decision. No price or territory changes have been made.
- App Privacy labels are not published. Workouts remain local; no analytics/advertising/account SDK is present. GitHub's privacy statement describes IP/request logging, while Apple's definition concerns off-device retention beyond serving a request. The exact update-host treatment and disclosure classification remain unresolved; do not certify "Data Not Collected" from local workout storage alone.
- Content rights declaration is not set. Existing Apple standard EULA and non-trader status are preserved.
- Regulated medical device declaration is not saved. Automatic approval review rejected saving No because this regulatory statement needs explicit owner approval. Do not retry until that approval arrives.
- No final build selected and no screenshots uploaded. The next native build must contain the final name/icon. No EAS operation or formal review submission was performed in this preparation session.
- Check any region-specific declarations shown by Apple once countries are selected. Do not accept legal agreements or invent business/trader information.

## Sources

- https://developer.apple.com/app-store/app-privacy-details/
- https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
- https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/
- https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
- Related workout app: https://steady.rocks/
