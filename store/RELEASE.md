# Steady Sets release preparation

Updated: 2026-09-07

## Verified and prepared

- Owner reports real-device testing complete. This is owner confirmation, not an additional automated device test.
- Final name: Steady Sets. Exact-name public web/App Store searches found no matching workout app; the related name Steady is used by another workout tracker. Search is not a trademark clearance or a guarantee that Apple will accept the name.
- English store copy is in metadata-en-US.json. Name, subtitle, promotional text, keywords and description fit Apple's field limits.
- Existing app record: 6808960698; keep bundle ID com.choongchoongeestar.workout.
- Build 5 was uploaded to TestFlight. The final name and icon require the next native build.
- Screenshots are supplied separately by the owner.

## App Store Connect actions pending authenticated browser access

- Save name/subtitle and English version metadata; verify Apple's name availability response.
- Set primary category to Health & Fitness, unless the current record already has it.
- Enter support and privacy URLs from metadata-en-US.json.
- Preserve existing review contact details if valid; request missing information privately rather than placing it in this repository.
- Pricing and country selection await the owner's decision. No price or territory changes have been made.
- Complete age-rating questions from actual app content: no ads, chat, public user content, gambling, contests, unrestricted web browsing or mature content. This is a personal exercise logger, not a medical advice or treatment app. Read the current wellness-topic definition before answering that field. Do not choose an arbitrary rating; Apple derives it from the answers.
- Verify App Privacy before publishing answers. Workouts remain local; no analytics/advertising/account SDK is present. GitHub Pages receives update requests, including ordinary network metadata. Review the host's handling against Apple's collection definition rather than automatically certifying "Data Not Collected" from local storage alone.
- Use manual release after approval. Do not submit for review until the final binary and screenshots are ready.
- Check any region-specific declarations shown by Apple once countries are selected. Do not accept legal agreements or invent business/trader information.

## Sources

- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/
- https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
- Related workout app: https://steady.rocks/
