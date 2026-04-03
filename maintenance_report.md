# Maintenance Report — Session 2 (2026-04-03)

> **Session 2 Summary:** Synced checklist with Session 1 analysis, fixed 4 items, verified 23 as pass, reported 11 new items.
>
> **Final counts:** 23 pass / 4 fixed / 36 reported / 0 pending
>
> **Fixed this session:** #35 (safe-area padding), #38 (History date-jump hidden when empty), #40 (exercise name truncation), #50 (SessionDetail empty state)
>
> **Passed (already implemented):** #12, #21, #23, #26, #27, #30, #31, #32, #33, #34, #39, #41, #42, #47, #48, #49, #52, #53, #54, #55, #60, #62, #63

---

# Maintenance Report — Session 1 (2026-04-03)

> Items requiring human review. These were verified via code inspection and/or browser testing.
> Auto-fixable items were fixed directly (see maintenance_checklist.json for statuses).

---

## SECURITY

---

### #1 — Firestore Security Rules
**Status:** reported (ask_human)
**Description:** Need to verify Firestore rules restrict access to `users/{uid}/data/workout` per-user.

**What to check:**
- Firebase Console → Firestore → Rules
- Confirm pattern: `allow read, write: if request.auth != null && request.auth.uid == userId;`
- Run Rules Playground: attempt read/write as a different UID and verify it is denied
- Confirm no wildcard `allow read, write: if true` rule exists

**Why human review:** Requires Firebase Console access — cannot be verified from code alone.

---

### #2 — No Content Security Policy (CSP)
**Status:** reported (ask_human)
**Description:** `index.html` has no `<meta http-equiv="Content-Security-Policy">` tag.

**Confirmed:** index.html has no CSP meta tag.

**Suggested fix:**
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' https://apis.google.com https://*.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com; img-src 'self' data: https://*.googleusercontent.com;">
```

**Why human review:** GitHub Pages does not support server-side headers, so CSP must be a meta tag. The correct `connect-src` domains for Firebase SDK need to be validated before deploying — a wrong CSP will break authentication.

---

### #3 — Firebase API Key Bundled in Client JS
**Status:** reported (ask_human)
**Description:** VITE_ prefixed Firebase config is intentionally public, but the Firebase project's authorized domains should be locked.

**What to verify in Firebase Console:**
- Authentication → Settings → Authorized domains
- Only `localhost` and the GitHub Pages production domain should be listed
- No stale domains (old staging URLs, etc.)

**Why human review:** Requires Firebase Console access. Firebase Web SDK keys being public is by design, but security depends entirely on Firestore rules (#1) and authorized domain restrictions.

---

### #4 — No Firebase App Check
**Status:** reported (ask_human)
**Description:** Unauthenticated API calls can be made to the Firebase project without App Check.

**What to evaluate:**
- Firebase Console → App Check — is enforcement enabled?
- For a personal single-user app, the risk is primarily quota abuse, not data theft (if Firestore rules are correct)
- Mitigation: Firestore rules (#1) already block unauthenticated reads/writes if properly configured

**Why human review:** Requires Firebase Console access and a cost/benefit decision for a personal app.

---

### #5 — `window.confirm()` for Session Delete (PWA Standalone Mode)
**Status:** reported (ask_human)
**Description:** `SessionDetail.jsx` line 19 uses `window.confirm()` for delete confirmation. Some browsers suppress `confirm()` dialogs in PWA standalone mode, causing silent deletion.

**Code location:** `src/screens/SessionDetail.jsx:19`
```jsx
if (window.confirm('이 세션을 삭제할까요?')) {
```

**Suggested fix:** Replace with an inline confirmation UI (e.g., a small confirm/cancel button row that appears after tapping 삭제):
```jsx
// Replace window.confirm with local state
const [confirmDelete, setConfirmDelete] = useState(false)
// Show: <button onClick={() => setConfirmDelete(true)}>삭제</button>
// Then: {confirmDelete && <div>정말 삭제할까요? <button onClick={doDelete}>확인</button> <button onClick={() => setConfirmDelete(false)}>취소</button></div>}
```

**Why human review:** Logic change affecting delete flow — needs UX decision.

---

### #6 — Google Profile Photo: No `referrerPolicy`
**Status:** reported (ask_human)
**Description:** `Settings.jsx` line 50 renders `user.photoURL` without `referrerPolicy="no-referrer"`.

**Code location:** `src/screens/Settings.jsx:50`
```jsx
<img src={user.photoURL} alt="프로필" className="w-10 h-10 rounded-full" />
```

**Suggested fix:**
```jsx
<img src={user.photoURL} alt="프로필" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full" />
```

**Why human review:** Low risk (trusted Firebase Auth source), but the fix is a 1-attribute change that requires decision on whether the referrer leakage concern warrants the change. Marking ask_human as per checklist.

---

## QA

---

### #7 — Auto-Save Overwrites `duration_min` with `null` on Edit
**Status:** reported (ask_human)
**Description:** Every auto-save writes `duration_min: null`, overwriting the duration saved when a session was originally completed.

**Code location:** `src/screens/Session.jsx:249`
```jsx
upsertSession({ id: sessionDate, date: sessionDate, exercises: sessionExercises, duration_min: null })
```

**Root cause confirmed:** The auto-save effect always passes `duration_min: null` regardless of whether the session was previously completed with a valid duration.

**Suggested fix:** Read the existing session's `duration_min` before overwriting:
```jsx
const existing = sessions.find(s => s.id === sessionDate)
upsertSession({ id: sessionDate, date: sessionDate, exercises: sessionExercises, duration_min: existing?.duration_min ?? null })
```

**Why human review:** Logic change to the core auto-save flow — could have unintended side-effects on the first session creation path.

---

### #8 — Removing All Exercises Leaves Empty Session in Firestore
**Status:** reported (ask_human)
**Description:** When all exercises are removed from a session, the empty session record is NOT deleted from Firestore.

**Code location:** `src/screens/Session.jsx:248`
```jsx
if (sessionExercises.length === 0) return  // early exit, no delete
```

**Root cause confirmed:** The auto-save effect returns early when exercises is empty, meaning an empty session (e.g., from removing all exercises) persists in Firestore with `exercises: []`.

**Suggested fix:** Call `deleteSession(sessionDate)` when `sessionExercises.length === 0` instead of returning early (with guard to avoid deleting on initial load).

**Why human review:** Logic change — need to distinguish between "user removed all exercises" vs. "initial load with no session yet".

---

### #9 — Same Exercise Can Be Added Multiple Times (No Duplicate Guard)
**Status:** reported (ask_human)
**Description:** Tapping the same exercise twice in the modal adds two separate cards with no warning.

**Code location:** `src/screens/Session.jsx:282`
```jsx
setSessionExercises(prev => [{ exerciseId: ex.id, sets }, ...prev])
```

**No duplicate check confirmed.** No guard before insertion.

**Suggested fix options:**
1. Show a warning toast: "벤치프레스가 이미 추가되어 있습니다"
2. Gray out already-added exercises in the modal
3. Allow duplicates but show "(2)" label on the card

**Why human review:** UX decision — duplicates may be intentional for supersets or circuit training.

---

### #10 — Progressive Overload Never Triggers for Bodyweight Exercises
**Status:** reported (ask_human)
**Description:** `epley.js` filters done sets using `s.done && s.weight`, but `s.weight` is `null` for bodyweight exercises, so no progression suggestion ever appears.

**Code location:** `src/lib/epley.js:15`
```js
const doneSets = ex.sets.filter(s => s.done && s.weight)
```

**Root cause confirmed:** `null` is falsy, so bodyweight sets are always filtered out.

**Suggested fix:** For bodyweight exercises, check `added_weight` or track reps progression:
```js
const doneSets = ex.sets.filter(s => s.done && (s.weight != null || s.added_weight != null))
```

**Why human review:** Logic change — need to decide what "progression" means for bodyweight (added weight increase? reps increase?).

---

### #11 — History Date-Jump: No Feedback When Date Has No Session
**Status:** reported (ask_human)
**Description:** Picking a date with no session in the History date input does nothing — no scroll, no toast.

**Code location:** `src/screens/History.jsx:16`
```jsx
if (el) {
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
// else: nothing happens — no user feedback
```

**Root cause confirmed.**

**Suggested fix:** Add a toast or inline message when `!el`:
```jsx
if (el) {
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
} else {
  // show toast: "해당 날짜에 기록이 없어요"
}
```

**Why human review:** Needs a toast/notification component — small UI addition.

---

### #13 — CardioDetail: Only `sets[0]` Rendered in SessionDetail
**Status:** reported (ask_human)
**Description:** `SessionDetail.jsx` only renders `se.sets[0]` for cardio exercises. Any additional cardio records are silently ignored.

**Code location:** `src/screens/SessionDetail.jsx:60`
```jsx
{se.sets[0] && Object.entries({...})...}
```

**Note:** The Session UI does not show a "+ 세트 추가" button for cardio exercises, so multiple cardio records cannot be added through the normal UI. This is a latent bug if data is added programmatically or if the UI changes.

**Why human review:** Design decision — verify whether multiple cardio records per exercise is intentional or not.

---

### #14 — React `key={exIdx}` on Exercise Cards (Index-Based Key)
**Status:** reported (ask_human)
**Description:** Exercise cards use array index as React key, which can cause incorrect component reuse when exercises are removed mid-list.

**Code location:** `src/screens/Session.jsx` — `key={exIdx}` on exercise card divs.

**Suggested fix:**
```jsx
key={se.exerciseId + '-' + exIdx}
```
Or use a stable per-session unique ID added when the exercise is inserted.

**Why human review:** Logic change — requires deciding on a stable key strategy (exerciseId alone is not unique if the same exercise is added twice).

---

### #15 — React `key={setIdx}` on SetRow (Index-Based Key)
**Status:** reported (ask_human)
**Description:** SetRows use array index as React key, which can cause stale input values when sets are removed.

**Code location:** `src/screens/Session.jsx` — `key={setIdx}` on SetRow elements.

**Suggested fix:** Assign a stable UUID or timestamp to each set when created in `newWeightSet()`.

**Why human review:** Logic change to data model — sets would need an `id` field.

---

### #16 — Settings: Unsaved Changes Lost on Navigate
**Status:** reported (ask_human)
**Description:** Changing body weight or rest timer in Settings and navigating away without pressing 저장 silently discards the changes.

**Confirmed from code:** Settings.jsx has no navigation guard or auto-save on change. Only `save()` on button press persists to localStorage.

**Suggested fix options:**
1. Auto-save on `onChange` (remove the 저장 button)
2. Show a navigation-block warning ("변경사항이 있습니다. 저장하지 않고 나가시겠습니까?")

**Why human review:** UX decision.

---

### #17 — `getHeight` / `setHeight` Dead API in storage.js
**Status:** reported (ask_human)
**Description:** `storage.getHeight` and `storage.setHeight` are defined in `src/lib/storage.js` but never called anywhere — leftover from the removed InBody feature.

**Code location:** `src/lib/storage.js:55-56`

**Confirmed:** Grep across entire `src/` finds zero usages outside of the definition.

**Suggested fix:** Remove `getHeight`, `setHeight`, and the `HEIGHT` key from `KEYS`. Also remove `wl_height` from `localStorage` (optional cleanup).

**Why human review:** Dead code removal is safe but involves a decision on whether height tracking will be re-added in a future phase.

---

### #18 — ExerciseModal Search is Case-Sensitive, Library Search is Not
**Status:** reported (ask_human)
**Description:** Session.jsx ExerciseModal uses `e.name.includes(query)` (case-sensitive), while Library.jsx uses `e.name.toLowerCase().includes(query.toLowerCase())` (case-insensitive). Inconsistent UX.

**Code locations:**
- `src/screens/Session.jsx:32` — case-sensitive
- `src/screens/Library.jsx:17` — case-insensitive

**Suggested fix (Session.jsx line 32):**
```jsx
const matchQ = !query || e.name.toLowerCase().includes(query.toLowerCase())
```

**Why human review:** The checklist risk is `ask_human` — likely intended as a UX review. The fix itself is trivial (one line), but marking as reported per protocol.

---

### #19 — Silent Fallback to Default Exercises on Firestore Load Error
**Status:** reported (logic_change)
**Description:** When Firestore fails to load, the app silently falls back to `DEFAULT_EXERCISES`. Users see the syncError banner on Home, but Library and Session modal show default exercises only with no explanation.

**Suggested fix:** Show a warning in Library when `!state.loaded` (data failed to load) so the user understands their custom exercises are temporarily unavailable.

**Why human review:** Logic change — requires deciding on fallback UX and whether to block the Library or just warn.

---

### #20 — Deleted Exercise Shows Raw `exerciseId` in SessionDetail
**Status:** reported (ask_human)
**Description:** When an exercise is deleted from Library, its past sessions in SessionDetail show the raw exercise ID string (e.g., `custom-1704891234567`) instead of a human-readable name.

**Code location:** `src/screens/SessionDetail.jsx:54`
```jsx
<h3 className="text-white font-semibold">{exercise?.name || se.exerciseId}</h3>
```

**Suggested fix:**
```jsx
<h3 className="text-white font-semibold">{exercise?.name ?? '[삭제된 운동]'}</h3>
```

**Why human review:** UX decision — verify the preferred fallback label.

---

### #22 — Login: All Auth Errors Show Same Generic Message
**Status:** reported (logic_change)
**Description:** Login screen shows the same '로그인에 실패했습니다. 다시 시도해주세요.' for all errors including popup-blocked, network failure, and auth failure.

**Suggested fix:**
```jsx
if (error.code === 'auth/popup-blocked') {
  setError('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.')
} else if (error.code === 'auth/popup-closed-by-user') {
  // User dismissed — no error message needed
} else {
  setError('로그인에 실패했습니다. 다시 시도해주세요.')
}
```

**Why human review:** Logic change to auth flow.

---

### #24 — Custom Exercise IDs Use `Date.now()` (Fragile)
**Status:** reported (logic_change)
**Description:** `Library.jsx` generates IDs with `` `custom-${Date.now()}` ``. While collision is practically impossible for a single user, it's fragile by design.

**Code location:** `src/screens/Library.jsx:24`

**Suggested fix:**
```jsx
const id = `custom-${crypto.randomUUID()}`
```
`crypto.randomUUID()` is available in all modern browsers (Chrome 92+, Safari 15.4+, Firefox 95+).

**Why human review:** Logic change — verify browser support requirements.

---

### #25 — `isDateChanging.current` + `setTimeout(0)` May Be Flaky in React StrictMode
**Status:** reported (logic_change)
**Description:** The pattern used to prevent auto-save on date change relies on a ref flag reset via `setTimeout(0)`. React StrictMode runs effects twice in dev, which could cause the flag to be reset before the second effect run.

**Code location:** `src/screens/Session.jsx:217-227`
```jsx
isDateChanging.current = true
setSessionExercises(...)
setTimeout(() => { isDateChanging.current = false }, 0)
```

**Note:** This only affects development mode (StrictMode is disabled in production builds). However, it could cause confusing behavior during dev testing.

**Why human review:** Architecture decision — fixing this properly requires rethinking the date-change/auto-save coordination pattern.

---

### #28 — Editing a Past Session Resets `duration_min` to `null`
**Status:** reported (ask_human)
**Description:** `finishSession()` only calculates `duration_min` when `sessionDate === realToday`. For past sessions, it always passes `duration_min: null`, erasing the previously stored duration.

**Code location:** `src/screens/Session.jsx:338-352`
```jsx
function finishSession() {
  let durationMin = null
  if (sessionDate === realToday) {
    // ... calculates duration
  }
  upsertSession({ ..., duration_min: durationMin })  // null for past sessions
}
```

**Related to #7:** Auto-save also overwrites with `null` on every change.

**Suggested fix:** For past sessions, preserve the existing `duration_min`:
```jsx
const existingDuration = sessions.find(s => s.id === sessionDate)?.duration_min ?? null
upsertSession({ ..., duration_min: sessionDate === realToday ? durationMin : existingDuration })
```

**Why human review:** Logic change to session completion flow.

---

### #29 — Library Not Accessible from Bottom Navigation
**Status:** reported (logic_change)
**Description:** The Library screen is only reachable via Settings → 운동 목록 보기. There is no direct Library entry in the bottom nav.

**Confirmed from Layout.jsx:** Bottom nav has only: 홈 (`/`), 운동 (`/session`), 기록 (`/history`), 설정 (`/settings`).

**Suggested fix options:**
1. Add Library as a 5th tab in the bottom nav (replace one of the current tabs)
2. Add a direct Library link on the Home screen
3. Keep current pattern (Library is a power-user feature accessible from Settings)

**Why human review:** UX/navigation architecture decision.

---

## POLISH

---

### #36 — PWA Manifest Icons Missing `purpose: 'any maskable'`
**Status:** reported (api_change)
**Description:** `vite.config.js` PWA manifest icons have no `purpose` field. Android may apply a white background to the icon.

**Code location:** `vite.config.js` PWA plugin icon entries.

**Suggested fix:**
```js
{ src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
{ src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
```

**Note:** Only add `maskable` if the icon has sufficient padding (safe zone = inner 80% of the image). If the icon bleeds to the edges, create a separate maskable variant.

**Why human review:** Requires checking the icon design and potentially creating a new icon asset.

---

*Report generated: 2026-04-03*
*Session 1 — first maintenance pass*

---

# Session 2 — New Reported Items (2026-04-03)

> Items identified during Session 2 code inspection. All require human review/decision.

---

## POLISH (UX Improvements — Human Decision Required)

---

### #37 — No Loading State While Firestore Loads
**Status:** reported (css_style)
**Description:** Library and Session ExerciseModal show default exercises immediately before Firestore data loads. If the user has custom exercises, there's a flash/update when data arrives.

**Code location:** `src/screens/Library.jsx`, `src/screens/Session.jsx` — both use `useApp()` but don't check `syncing` state before showing exercises.

**Suggested fix:** Check `syncing` from context and show a spinner or "로딩 중..." message when `!state.loaded` in Library and ExerciseModal.

**Why human review:** Feature addition — requires plumbing `loaded` state into Library/ExerciseModal components.

---

### #43 — Session Date No Visual Affordance
**Status:** reported (css_style)
**Description:** The session date in the Session header is tappable (to change date) but has no visual cue. Users may not discover this feature.

**Code location:** `src/screens/Session.jsx:360-371` — invisible `opacity-0` date input overlaid on `pointer-events-none` date text.

**Suggested fix:** Add a small pencil icon (✏️) or underline style next to the date to hint it's interactive.

**Why human review:** UX design decision on how to indicate interactivity.

---

### #44 — No Scroll-to-Top on Navigation
**Status:** reported (css_style)
**Description:** Navigating between screens via the bottom nav does NOT reset the scroll position of `<main>`. The same scroll container persists across all routes, so scrolling down in History, navigating away, and returning still shows the scrolled position.

**Code location:** `src/components/Layout.jsx:48` — `<main>` is the shared scroll container.

**Suggested fix:** Add `useLocation` + `useEffect` to Layout to call `mainRef.current?.scrollTo(0, 0)` on route change:
```jsx
const location = useLocation()
const mainRef = useRef(null)
useEffect(() => { mainRef.current?.scrollTo(0, 0) }, [location.pathname])
```

**Why human review:** UX decision — scroll reset vs. scroll preservation (e.g., going back to History should it remember position?).

---

### #45 — ExerciseModal No Focus Trap
**Status:** reported (accessibility_basic)
**Description:** Keyboard Tab can navigate focus outside the ExerciseModal. No Escape-key close handler.

**Code location:** `src/screens/Session.jsx` — `ExerciseModal` component has no `onKeyDown` handler.

**Why human review:** Accessibility enhancement requiring decision on keyboard UX and potential focus trap library dependency.

---

### #46 — Home No Loading Skeleton
**Status:** reported (css_style)
**Description:** The recent sessions list on Home is empty until Firestore loads. No skeleton placeholder is shown during the loading period.

**Code location:** `src/screens/Home.jsx:43-76` — empty state shows when sessions.length === 0, but this also triggers while loading.

**Suggested fix:** Show skeleton placeholder cards when `syncing && sessions.length === 0`.

**Why human review:** Feature addition — needs skeleton card design decision.

---

### #51 — Home No '전체 보기' Link
**Status:** reported (css_style)
**Description:** The Home screen shows only the most recent 5 sessions with no link to view all. Users may not realize there are more sessions in History.

**Code location:** `src/screens/Home.jsx:42-76` — no '기록 전체 보기 →' link to `/history`.

**Suggested fix:** Add a `<Link to="/history">` button below the recent sessions list.

**Why human review:** UX addition — simple to implement but requires design decision on placement and label.

---

### #56 — Session Modal No 'Already Added' Indicator
**Status:** reported (css_style)
**Description:** Exercises already added to the current session show no visual indicator in the ExerciseModal. Adding the same exercise twice creates duplicates silently.

**Related to:** #9 (same exercise duplicate guard, reported in Session 1).

**Code location:** `src/screens/Session.jsx` — `ExerciseModal` renders all exercises without checking current session.

**Why human review:** UX decision — gray out, badge, or allow duplicates (for supersets).

---

### #57 — Cardio Calorie No MET Indication
**Status:** reported (css_style)
**Description:** When a cardio exercise has no MET value, entering a duration shows no auto-calculation and no hint explaining why.

**Code location:** `src/screens/Session.jsx:188-198` — calorie label shows '— 자동계산됨' only when calories + duration exist, but gives no hint when MET is missing.

**Suggested fix:** When `!exercise?.met`, show a hint like `'MET 미설정 — 수동 입력'` next to the calorie label.

**Why human review:** Minor UX text change — needs decision on label wording.

---

### #58 — RestTimer No Haptic Feedback
**Status:** reported (css_style)
**Description:** When the rest timer finishes, it simply disappears with no haptic or audio notification. On mobile with screen off, the user won't know the timer ended.

**Code location:** `src/components/RestTimer.jsx:6-10` — `onDone()` called when `seconds <= 0`, no vibration.

**Suggested fix:**
```js
if (navigator.vibrate) navigator.vibrate([200, 100, 200])
```
Add before calling `onDone()`.

**Why human review:** Feature addition — navigator.vibrate() is not supported on iOS Safari. Needs decision on implementation.

---

### #59 — History Shows '세트' for Cardio Records
**Status:** reported (css_style)
**Description:** Session cards in History show `N종목 · M세트` even for cardio-only sessions. Cardio has 1 "record" not a "set", making the label technically wrong.

**Code location:** `src/screens/History.jsx:39` — `totalSets` counts all sets including cardio records.

**Suggested fix:** Either omit set count for cardio-only sessions, or show '1기록' vs 'M세트'.

**Why human review:** UX/label decision.

---

### #61 — Library Exercises in Insertion Order
**Status:** reported (css_style)
**Description:** Exercises in Library appear in the order they were added to `exercises.js`. Custom exercises appear at the end of the list regardless of category.

**Code location:** `src/screens/Library.jsx:15-19` — no sort applied to `filtered` exercises.

**Suggested fix:**
```js
const filtered = exercises.filter(...).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
```

**Why human review:** UX preference — may prefer insertion order for built-in exercises, alpha sort for custom ones.

---

*Session 2 — second maintenance pass (2026-04-03)*
