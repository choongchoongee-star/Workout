# Workout Logger — 기획서 (재구성용 마스터 스펙)

> 마지막 업데이트: 2026-09-05
> 현재 Phase: Phase 4 (로컬 전용 iOS 전환) 구현 완료 — EAS 빌드 실패 원인 수정 완료·빌드 4 TestFlight 업로드 완료·Apple 처리 및 실기기 검증 대기
> 본 문서는 **이 문서만으로 동일한 앱을 처음부터 재구성**할 수 있도록 작성한다. 화면별 와이어프레임·데이터 모델·핵심 로직·디자인 토큰을 모두 포함한다.

> **언어 규칙:** 사용자에게 표시되는 앱 UI, 날짜, 기본 운동 이름·카테고리, 오류 메시지, 새 Markdown 내보내기는 모두 영어다. 과거 Firebase 데이터에서 내보낸 백업과 2026-09-03 이전 한국어 Markdown 백업은 가져올 때 영어 기본 운동으로 정규화한다. 본 문서의 한국어 설명은 개발 문서용이며, 와이어프레임에 남은 한국어 표현보다 이 규칙과 실제 영문 UI 문구가 우선한다.

---

## 1. Overview

- **목적:** 웨이트 + 유산소 운동 세션을 최소 마찰로 기록하는 개인용 iOS 앱
- **핵심 철학:** "운동 중에 빠르게 기록" — 탭 수 최소화, 자동 입력(이전 값 재사용), 자동 저장
- **핵심 제약사항:** 로그인·운동 데이터 백엔드·운동 기록 전송 없음, 기기 내 저장, 1일 1세션. 앱 업데이트 파일은 GitHub Pages에서 다운로드한다.
- **주요 사용자:** Charlie (단일 사용자, 개인용)
- **플랫폼:** Capacitor 기반 iOS 앱 우선. 동일 React 앱의 브라우저/PWA 빌드도 개발·미리보기용으로 유지. 세로형 `max-w-lg`, 다크 테마 고정

---

## 2. 기술 스택 & 빌드/배포

### 스택
- **React 19** + **Vite 8** (`@vitejs/plugin-react`)
- **Tailwind CSS v4** (`@tailwindcss/vite` 플러그인 방식 — `tailwind.config` 없이 CSS-first)
- **react-router-dom v7** (`BrowserRouter`, `basename="/Workout"`)
- **Capacitor v8** — iOS 네이티브 셸, Filesystem, Local Notifications, Share
- **Capawesome Live Update v8** — 서명된 자체 호스팅 OTA, 네이티브 runtime별 배포, 시작 실패 시 내장 버전 복구
- **vite-plugin-pwa v1** (`registerType: 'autoUpdate'`, Workbox `generateSW`)
- 앱 아이콘: 불투명 1024×1024 iOS AppIcon + 동일 디자인의 PWA 192/512 아이콘

### vite.config.js 핵심
```js
base: mode === 'capacitor' ? './' : '/Workout/',
mode !== 'capacitor' && VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Workout Logger', short_name: 'Workout',
    theme_color: '#f7eae0', background_color: '#f7eae0',
    display: 'standalone', start_url: '/Workout/',
    icons: [192, 512]  // any maskable
  }
})
```

### npm scripts
| script | 동작 |
|--------|------|
| `dev` | `vite` (로컬 개발 서버) |
| `build` | `vite build` (→ `dist/`) |
| `build:ios` | `vite build --mode capacitor` (상대 base, 서비스워커 제외) |
| `ios:sync` | iOS 빌드 후 `cap sync ios` |
| `ios:open` | macOS에서 Xcode 프로젝트 열기 |
| `check:ios-release` | 번들 ID·버전·기기·방향·Scheme·EAS archive 절차의 일관성 검사 |
| `ota:prepare` | 네이티브 fingerprint 검사 후 Capacitor ZIP·체크섬·서명을 로컬 생성 |
| `ota:publish` | 승인 후 `ota-release/`를 gh-pages의 `ota/`에 추가 배포 (EAS 미사용) |
| `lint` | `eslint .` |
| `preview` | `vite preview` |
| `icons` | `node generate-icons.mjs` (PWA 아이콘 생성) |
| `build:site` | 앱 소개·지원·개인정보처리방침을 `site-dist/`에 구성 |
| `deploy` | `scripts/deploy-site.mjs`로 안내 사이트만 게시, 이전 PWA 파일 제거 및 `ota/` 보존 |

### 배포 (중요)
- **자동 CI 없음.** `master` 푸시는 소스만 올라감.
- 공개 사이트 반영은 **수동으로 `npm run deploy`** 실행 → `site-dist/`를 `gh-pages` 브랜치로 push → GitHub Pages 서빙. 공개 루트는 `site/index.html`의 영문 iPhone 앱 소개·TestFlight 준비 상태·지원 링크이며 운동 기록 UI나 OTA 파일 링크를 표시하지 않는다. 개인정보처리방침은 `/privacy/`, OTA는 `/ota/<runtime>/`에 유지한다.
- 라이브 URL: `https://choongchoongee-star.github.io/Workout/`
- 브라우저/PWA 운동 UI는 로컬 개발용이다. 공개 배포 시 기존 앱 JS/CSS·manifest·Workbox 파일을 제거하고 `site/sw.js`로 이전 서비스워커를 해제한다. 기존 브라우저의 localStorage 운동 기록은 삭제하지 않는다. 오프라인 캐시 사용자는 온라인 복귀 후 worker 갱신 시 안내 페이지로 전환된다.
- iOS 앱은 `npm run ios:sync` 후 `ios/App.xcodeproj`의 공유 `App` Scheme을 빌드한다. App Store용 원격 빌드·서명은 `.eas/build/ios-production.yml`의 Capacitor/SPM 전용 EAS Custom Build를 사용한다. 웹 빌드와 프로젝트 경로 어댑터 동기화 후 EAS 자격 증명·버전을 적용하고 Release archive를 업로드하며, Expo prebuild와 CocoaPods는 실행하지 않는다.
- EAS 프로젝트는 `@choongchoongee/workout-logger`(project ID `ca086289-002e-40a4-a2ee-c11e84212f41`)에 연결되어 있다. `eas.json`의 production profile은 store 배포, 자동 build number 증가, `NPM_CONFIG_LEGACY_PEER_DEPS=true`를 사용한다. 실제 원격 빌드는 Apple 자격 증명과 실기기 체크 준비 후 최종 단계에서만 시작한다.
- 앱 ID는 `com.choongchoongeestar.workout`, 초기 마케팅 버전은 `1.0`, 현재 build number는 `4`이다 (승인된 재빌드에서 증가한 값을 보존). 비면제 암호화 미사용 선언(`ITSAppUsesNonExemptEncryption=false`)은 네이티브 Info.plist와 EAS 앱 설정 양쪽에 둔다.
- iOS target은 iPhone(`TARGETED_DEVICE_FAMILY=1`) 전용이며 세로 방향만 지원한다.
- EAS production iOS profile에는 `scheme: App`을 명시한다. 공유 Xcode 프로젝트는 EAS가 검색하는 `ios/App.xcodeproj`에 있으며 앱 소스는 `ios/App/App`, SPM은 `ios/App/CapApp-SPM`에 유지한다. pbxproj의 source group·Info.plist·debug config·SPM 상대 경로는 프로젝트 위치에 맞춘다.
- `scripts/ios-project.mjs`는 고정한 Capacitor CLI 8.5.1의 config를 로드하고 Xcode 프로젝트 경로를 지정한 뒤 공식 copy/update 작업을 호출한다. 의존성 소스는 수정하지 않는다. 복사 실패는 중단하며 `npm run ios:sync` 및 `ios:open`은 이 adapter를 사용한다. 직접 `cap sync ios`는 기본 중첩 경로를 가정하므로 사용하지 않는다.
- EAS CLI 23.2.0의 로컬 파서로 Scheme·Release 구성·target·bundle ID 해석을 검증했다. 실제 archive·서명·TestFlight 제출은 별도 실행 결과로 확인해야 한다. 프로젝트 경로 변경으로 OTA native runtime은 `ios-edab217484237bd7`로 갱신했으며 기존 runtime OTA를 적용하지 않는다.
- 앱은 Firebase 환경변수나 서버 자격 증명을 사용하지 않는다.
- EAS 실행은 필요성이 확인된 경우에만 구체적인 작업을 설명하고 사용자 확인을 받은 뒤 진행한다. 읽기 전용 CLI 조회, 프로젝트 연결, 자격 증명, 빌드, TestFlight/App Store 제출, OTA 배포 및 동등한 API·대시보드 작업에도 적용한다. 로컬 설정 편집·검증과 GitHub 푸시는 별개다. 이 규칙은 `.agents/skills/workout-maintenance/SKILL.md`에 유지한다.

---

## 3. 아키텍처

### 폴더 구조
```
Workout/
├── src/
│   ├── main.jsx              # 엔트리, <App/> 렌더
│   ├── App.jsx               # Provider + Router + 라우트 정의
│   ├── index.css             # Tailwind import + 커스텀 애니메이션(animate-slide-up 등)
│   ├── screens/              # 화면 컴포넌트
│   │   ├── Session.jsx       # Active Session (핵심 화면)
│   │   ├── History.jsx       # 기록 목록
│   │   ├── SessionDetail.jsx # 기록 상세
│   │   ├── Weight.jsx        # 무게 탭 — 운동별 과거 세트 연속 조회
│   │   ├── Library.jsx       # 운동 목록/커스텀 관리
│   │   └── Settings.jsx
│   ├── components/
│   │   ├── Layout.jsx        # 하단 네비(운동/기록/무게/설정) + 스크롤 위치 관리
│   │   ├── StepperInput.jsx  # 상시 ± 조절 + 숫자 버튼/보조 dialog
│   │   ├── RestTimer.jsx     # 휴식 타이머 (원형 진행 + 바)
│   │   └── UndoToast.jsx     # 10초 되돌리기 토스트
│   ├── context/
│   │   └── AppContext.jsx    # 운동 상태 + 기기 로컬 파일 자동 저장
│   ├── lib/
│   │   ├── localWorkoutData.js # iOS 파일 / 웹 localStorage 영속화
│   │   ├── calories.js       # MET 기반 칼로리 계산 (calcCalories)
│   │   ├── sessionUtils.js   # getMainCategory (그날 메인 카테고리)
│   │   ├── dateUtils.js      # localTodayStr, formatDate
│   │   ├── exportUtils.js    # 영문 Markdown + 복원용 JSON 메타데이터 생성
│   │   ├── importUtils.js    # 신·구 Markdown 검증/파싱 + 중복 없는 병합 계획
│   │   ├── exerciseLibrary.js # 기본 목록 병합 + 한국어 데이터 영문화
│   │   ├── restTimer.js      # 절대 종료 시각 기반 남은 시간 계산
│   │   ├── restNotification.js # 휴식 종료 1회 소리 + 재생 실패 시 진동
│   │   ├── workoutFileExport.js # iOS 공유 시트 / 웹 다운로드 백업
│   │   ├── appSettings.js    # 알림 거부 시 앱별 iPhone Settings 열기
│   │   └── storage.js        # localStorage 설정값 (휴식 시간, 체중 기본값)
│   ├── data/
│   │   └── exercises.js      # DEFAULT_EXERCISES(61개), 영문 카테고리 + 한국어 호환 별칭
│   └── ...
├── ios/                      # Capacitor Xcode 프로젝트 + 앱 설정 브리지 + 공유 App Scheme
├── .eas/build/ios-production.yml # Capacitor/SPM용 EAS Custom Build
├── app.json                  # EAS 프로젝트·iOS 제품 설정
├── eas.json                  # production build/submit profile
├── scripts/verify-ios-release.mjs # 원격 빌드 전 정적 release gate
├── capacitor.config.json     # 앱 ID, webDir, iOS 알림 표시 옵션
├── public/                   # PWA 아이콘(icon-192/512.png), manifest 산출물
├── generate-icons.mjs
└── vite.config.js
```

### 핵심 데이터 흐름
```
앱 시작 → AppProvider가 기기 로컬 데이터에서 1회 로드
  iOS: Directory.Data/workout-data.json
       + workout-data.backup.json (직전 정상본)
  Web/PWA: localStorage[wl_workout_data_v1]
  (파일/키가 없으면 기본61개, sessions=[])
  ├ 로드 중: 자식 화면 마운트 보류 + 전체 화면 로딩 표시
  ├ 성공: 데이터를 반영하고 loaded=true, syncing=false
  └ 실패: 빈 데이터로 대체하지 않고 오류 + [다시 시도] 표시

운동 데이터 변경 → reducer state 갱신 → 500ms 디바운스 후 전체 JSON 저장
  pending 파일 쓰기/검증 → 기존 정상 파일을 backup으로 보존 → 주 파일 쓰기/재검증
  시작 시 주 파일이 손상되면 backup을 검증해 자동 복원하고 사용자에게 알림
  (로드 직후 첫 실행은 justLoadedRef로 스킵 — 빈 데이터 덮어쓰기 방지)

설정값(휴식 시간) → localStorage (수동 저장)
세션 시작 시각 → sessionStorage (소요시간 계산용)
```

### 외부 의존성
- 운동 기록은 오프라인으로 동작한다. OTA만 GitHub Pages에 연결하며 Capawesome 클라우드 API는 사용하지 않는다. 앱별 채널에는 네이티브 fingerprint를 저장하고 같은 runtime의 서명된 ZIP만 다운로드한다.

### OTA 동작과 배포
- `src/lib/otaUpdate.js`: 정상 데이터 로드 후 Layout 마운트에서 `ready()`를 호출하고 시작 시 1회 확인한다. Settings의 `Check for updates`로 수동 확인 가능. 운동 중 WebView를 강제로 재시작하지 않고 완전 종료 후 재실행 시 적용한다.
- `capacitor.config.json`의 LiveUpdate는 자동 클라우드 갱신을 끄고 `readyTimeout=30000`, 실패 bundle 차단, 미사용 bundle 삭제, RSA 공개키를 설정한다. 준비 신호가 오지 않으면 내장 bundle로 복구한다.
- manifest는 `/Workout/ota/<runtime>/latest.json`의 `{schema:1,runtime,bundle:{bundleId,url,checksum,signature}}` 형식. bundle ID는 ZIP SHA-256이며 URL은 동일 경로의 `<bundleId>.zip`만 허용한다. `bundle:null`은 다음 실행 시 내장 버전 복원 요청이다.
- `scripts/ota-native.mjs`는 Swift·plist·스토리보드·네이티브 프로젝트·SPM·플러그인 버전·Capacitor 설정으로 fingerprint를 계산한다. `ota:prepare`와 `check:ios-release`는 native runtime 불일치 시 중단한다. 네이티브 변경 후 기존 runtime으로 OTA만 배포하면 안 된다.
- `scripts/ota-prepare.mjs`는 fresh Capacitor 빌드만 ZIP으로 만들고 서명을 재검증한 뒤 Git 제외 폴더 `ota-release/`에 산출한다. 개인키 `.ota-keys/private.pem`은 별도 비공개 백업이 필요하며 Git·배포에 포함하지 않는다. 최초 초기화는 `scripts/ota-init.mjs`이며 기존 키가 있으면 중단한다.
- 공개 정책에 OTA 요청과 GitHub의 IP 등 기술 정보 처리를 고지한다. 운동·기기 식별자는 업데이트 요청에 포함하지 않는다. GitHub Pages 게시와 정책 갱신은 별도 배포 승인을 받은 뒤 진행한다. 안내 사이트 배포는 제거 대상에서 `ota/`를 제외해 모든 기존 OTA runtime을 보존한다.
- 첫 EAS 빌드는 웹 자산 생성 단계에서 실패했으며 설치 환경 보정 후 build 4의 Release archive·서명·IPA 생성이 완료됐다. OTA 플러그인이 포함된 iPhone 앱 설치 후 정상/변조 ZIP·오프라인·시작 실패 복구·운동 중 비재시작을 TestFlight에서 검증해야 한다. 저장 형식 변경은 이전 bundle과 호환되어야 한다.

---

## 4. 데이터 모델

### 4.1 기기 로컬 운동 파일
```json
{
  "version": 1,
  "exercises": [ Exercise, ... ],   // 기본61 + 커스텀
  "sessions":  [ Session, ... ]     // 날짜 역순 정렬 유지
}
```
- iOS는 `@capacitor/filesystem`의 `Directory.Data/workout-data.json`에 UTF-8 JSON으로 저장한다. 저장 전 `workout-data.pending.json`을 검증하고 직전 정상 상태를 `workout-data.backup.json`에 유지한다. 웹/PWA도 main/pending/backup localStorage 키로 같은 절차를 적용한다.
- 주 저장소가 누락되거나 손상되고 정상 백업이 있으면 백업을 주 저장소로 복원한다. 복구 후 앱 상단에 `Your workouts were recovered from the last safe backup.`을 표시한다.
- 파일이 없을 때만 새 사용자로 처리한다. JSON이 손상되거나 배열 구조가 아니면 빈 데이터로 덮어쓰지 않고 로드 오류와 재시도를 표시한다.
- 기기 간 자동 동기화는 없다. 앱 삭제·기기 분실에 대비한 이식 수단은 Markdown 백업이다.

### 4.2 Exercise
```json
{ "id": "bench-press", "name": "Bench Press", "category": "Chest",
  "type": "weight | bodyweight | cardio", "met": 8.3 }
```
- `id`: 기본 운동은 고정 슬러그, 커스텀은 `custom-${crypto.randomUUID()}`
- `category`: CATEGORIES 중 하나 (`Chest/Back/Shoulders/Arms/Legs/Core/Cardio`)
- `met`: cardio 타입에만 존재 (칼로리 계산용). 그 외 타입은 필드 없음/null
- 커스텀 판별: `id.startsWith('custom-')`이면서 영문 기본 운동 정의와 일치하지 않을 때만 라이브러리에서 색상 구별 + 삭제 가능. 과거 사용자가 추가했던 운동이 현재 기본 운동과 이름·카테고리·타입이 같으면 기존 ID를 유지한 채 기본 운동으로 승격한다.

### 4.3 Session (id === date, 1일 1세션)
```json
{ "id": "2026-03-14", "date": "2026-03-14",
  "exercises": [ SessionExercise, ... ], "duration_min": 65 }
```
- `id` = `date` = `YYYY-MM-DD` (로컬 기준, `localTodayStr()`)
- `duration_min`: 오늘 세션은 변경 사항을 자동 저장할 때 sessionStorage 시작 시각으로 계산(최소 1분). 다른 날짜를 편집할 때는 null

### 4.4 SessionExercise
```json
{ "exerciseId": "bench-press", "sets": [ Set, ... ] }
```

### 4.5 Set
- **weight:** `{ "weight": 80, "reps": 10, "done": false }`
- **bodyweight:** `{ "added_weight": 0, "reps": 10, "done": false }` (weight 없음)
- **cardio:** `{ "duration_min": 35, "distance_km": 5.2, "speed_kmh": 8.5, "incline_pct": 2.0, "calories": 338 }` — cardio는 항상 sets 길이 1 (단일 기록)
- `done`: 세트 완료 체크. true면 입력 잠금(다시 눌러야 수정)

### 4.6 localStorage (`storage.js`)
| 키 | 의미 | 기본값 | 비고 |
|----|------|--------|------|
| `wl_rest_seconds` | 휴식 타이머 초 | 90 | 설정 탭에서 수정 |
| `wl_body_weight` | 체중(kg) | 70 | **설정 UI 제거됨(2026-06-14)**, 칼로리 계산 시 기본값 70 사용 |
- private/incognito 등 접근 불가 환경 안전 처리(try/catch, isAvailable).

### 4.7 sessionStorage
| 키 | 의미 |
|----|------|
| `wl_session_start_{today}` | 오늘 세션 첫 진입 시각(ms). 완료 시 소요시간 계산 후 제거 |

---

## 5. 네비게이션 / 라우팅

`App.jsx` 구조: `<BrowserRouter><AppProvider><Layout><Routes>...`
- iOS 빌드 basename=`/`, 웹/PWA basename=`/Workout`.
- AppProvider 데이터 로드 중 → Layout/Routes를 아직 마운트하지 않고 전체 화면 로딩 표시
- AppProvider 데이터 로드 실패 → 빈 기록 화면 대신 오류와 [다시 시도] 표시

| 경로 | 화면 | 비고 |
|------|------|------|
| `/` | → `/session` 리다이렉트 | 홈 탭 제거(2026-06-13) |
| `/session` | Session | 기본 진입 |
| `/history` | History | |
| `/history/:id` | SessionDetail | |
| `/weight` | Weight | 무게 탭 (2026-06-28 신설) |
| `/library` | Library | |
| `/settings` | Settings | |
| `/privacy` | Privacy Policy | Settings에서 진입하는 앱 내 영문 개인정보처리방침 |
| `*` | → `/session` 리다이렉트 | |

**하단 탭(Layout):** `Workout(/session)` · `History(/history)` · `Progress(/weight)` · `Settings(/settings)` 4개.
- 하단 탭 배경은 `bg-accent-600`(짙은 초록), 활성 탭은 `text-zinc-800`(살구), 비활성은 `text-zinc-950/80`(크림).
- 라이브러리(`/library`)는 탭 없음 — Progress의 `Manage exercises`에서 진입. 커스텀 운동 추가는 Progress 우상단 +에서 바로 수행한다.

---

## 6. 화면별 명세 + 와이어프레임

> 공통: 다크 배경 `bg-zinc-950`, 콘텐츠 `max-w-lg mx-auto p-4`, 하단 네비 높이만큼 `pb`.

### 6.1 Session — Active Session (핵심) `/session`
```
┌──────────────────────────────────────┐
│ 오늘                                   │  ← 완료 버튼 없음(자동저장, 2026-06-14)
│ 2026년 6월 14일 ⌄                       │  ← 날짜(점선밑줄). 탭하면 date picker
│                                        │     (max=오늘). 다른날 = "다른 날 기록"
│ (동기화 실패 시 빨간 배너)               │
│  아래 버튼을 눌러 운동을 추가하세요       │  ← 비었을 때
│ ┌────────────────────────────────────┐│
│ │ Bench Press                Delete ││  ← 실제 UI는 큰 카드 배경 없는 구분선 목록
│ │   #     kg          Reps    Done  ││  ← 열 제목은 운동당 한 번 표시
│ │ ×       80          10      [✓] ││  ← 삭제는 왼쪽, 완료는 오른쪽에 상시 표시
│ │ ──────────────────────────────── ││  ← 화면 높이에 맞춘 행, 얇은 구분선
│ │ 1      −  +        −  + ││
│ │ ...                               ││
│ │            + 세트 추가               ││  ← 추가 시 이 영역이 화면 중앙에 보이도록 스크롤
│ └────────────────────────────────────┘│
│ ┌────────────────────────────────────┐│
│ │      + 운동 추가  (점선 테두리)        ││  ← 목록 '맨 아래'(2026-06-14). 탭 → 바텀시트
│ └────────────────────────────────────┘│
│              (휴식 타이머 오버레이)       │  ← 세트 완료 시 하단 떠오름
│              (되돌리기 토스트)           │  ← 삭제 시
└──────────────────────────────────────┘
```
**동작 명세**
- **헤더:** 날짜만 표시. **완료 버튼 없음**(2026-06-14 제거 — 모든 변경이 자동 저장되므로 불필요).
- **운동 추가:** [+ 운동 추가] 버튼은 **운동 목록 맨 아래**에 위치(2026-06-14 상단→하단 이동). 탭 → 바텀시트(`h-[80vh]` 고정). 상단 검색 input(**autoFocus 없음** — 키보드 자동 노출 방지, 2026-06-14), 카테고리 칩(전체+7), 운동 리스트. 기본 카테고리 = 현재 세션 메인 카테고리 → 없으면 과거 세션 메인 → 없으면 '전체'. 이미 추가된 운동은 흐리게 + "추가됨". Escape/배경 탭으로 닫기, Tab 포커스 트랩.
- **운동 추가 결과:** 새 운동은 **0세트**로 목록 **맨 아래**에 추가(cardio는 빈 기록 1개 자동 생성). **추가 직후 새 운동 카드를 `scrollIntoView({block:'center'})`로 스크롤**해 바로 보이게 함(2026-06-14).
- **세트 추가:** 첫 세트면 **과거 세션의 마지막 세트 값**을 기본값으로(getLastSession), 이후 세트는 직전 세트 값 복사. 기본 폴백 weight=20/reps=10. **추가 직후 해당 운동의 '세트 추가' 버튼 영역을 `scrollIntoView({block:'center'})`로 스크롤**해 새 세트가 바로 보이게 함(2026-06-14).
- **숫자 수정:** 목록의 밑줄 숫자를 누르면 해당 운동명·세트 번호·Weight/Added weight/Reps가 표시된 native dialog를 연다. 목록의 ± 버튼은 항상 표시하며 한 번 누르면 즉시 값에 반영하고 자동 저장한다. 큰 dialog는 숫자 직접 입력을 위한 보조 경로이며 ± 조작에 필수 단계가 아니다. 창에는 56px ± 버튼, 30px 숫자 직접 입력, 단위, 48px 이상 Cancel/Apply 버튼이 있다. kg 증감 2.5 / lbs 증감 5 / reps 증감 1. 입력을 누르면 전체 선택한다. dialog 안의 초안은 Apply만 값을 반영하고 Cancel·Escape·창 배경 클릭은 버린다. 빈 값·유한하지 않은 값·최솟값 미만은 적용할 수 없다. dialog가 열릴 때 제목에 포커스를 두어 키보드를 자동 표시하지 않는다. 완료 세트의 숫자 수정은 잠긴다.
- **세트 행 밀도와 조작 구분:** 한 운동 5세트와 운동명·열 제목·Add set 영역이 화면 높이 약 80%를 차지하는 구성을 기준으로 한다. 2개 운동/10세트 한 화면 압축은 목표가 아니다. `.workout-set-row` 최소 높이는 `clamp(5.25rem, calc((80svh - 6.75rem) / 5), 8rem)`로 화면 높이에 따라 변한다. 320×667, 375×667, 390×844, 430×932에서 운동 영역은 약 80.2~80.3%, 행은 약 85~128px이며 첫 5세트는 하단 탭 위에 모두 보인다. 4열은 Set(× 삭제와 번호), kg/lbs, Reps, Done이다. 각 입력기는 24px 숫자를 위에, 항상 보이는 ±를 아래에 둔다. 증감·삭제·완료 클릭 영역은 최소 44×44px다. 삭제는 왼쪽 ×, 완료는 오른쪽 체크로 분리하고 초록 완료 상태와 입력 잠금을 유지한다. 운동명 16px, 번호·열 제목·Add set은 14px다. 키보드가 닫힌 기본 글자 크기 기준이며 확대 시 스크롤을 허용한다. 실제 iPhone 확인은 별도다.
- **세트 완료(✓):** 토글. 미완료→완료로 바뀔 때만 휴식 타이머 시작(해제 시엔 안 켜짐). 완료 시 행 잠금(opacity↓, 입력 disabled).
- **bodyweight:** added_weight 스테퍼(kg step 2.5 / lbs step 5) + reps. `BW +` 또는 `Bodyweight+` 접두어는 표시하지 않는다.
- **cardio:** 카드에 폼(시간/거리/속도/경사 number input 2열 + 칼로리). duration·met 있으면 칼로리 자동계산(수정 가능), met 없으면 수동 입력 안내.
- **삭제:** 각 행 맨 왼쪽의 ×로 세트를 바로 삭제한다. 접근성 이름은 Delete set이며 완료 체크와 반대쪽에 상시 표시한다. 운동 전체 삭제는 제목 오른쪽 `Delete` 버튼이며 유산소에도 동일하다. 편집 모드나 숨겨진 삭제 버튼은 없다. 삭제 → 즉시 제거 + UndoToast(10초), 되돌리기 시 값·완료 상태·순서를 복원한다. `+ Add set`은 운동 목록 바로 아래의 얇은 텍스트 버튼이다.
- **자동 저장 + 소요시간:** sessionExercises 변경 시 `upsertSession` → AppContext 500ms 디바운스 → 로컬 JSON 파일. 빈 세션(길이 0)은 저장 안 함. **오늘 세션이면 자동저장 시 sessionStorage 시작시각 기준 `duration_min`도 함께 계산해 저장**(완료 버튼 제거에 따라 이전 [완료] 로직을 자동저장으로 이관, 2026-06-14). 다른 날 편집은 duration=null.
- **날짜 변경:** 헤더 date input 변경 → 해당 날짜 세션 로드(없으면 빈 배열). 날짜 전환 중엔 auto-save 스킵(`isDateChanging`).

### 6.2 History — 기록 목록 `/history`
```
┌──────────────────────────────────────┐
│ 운동 기록            [📅 2026-06-14]   │  ← 날짜 점프 picker(세션 있을 때만)
│ ┌────────────────────────────────────┐│
│ │ 2026년 6월 13일 (토)          가슴   ││  ← 왼:날짜  오른:그날 메인 카테고리
│ └────────────────────────────────────┘│     (2026-06-14: 시간→카테고리로 변경)
│ ┌────────────────────────────────────┐│
│ │ 2026년 6월 11일 (목)          하체   ││
│ └────────────────────────────────────┘│
│  아직 기록이 없어요                      │  ← 비었을 때
│              (되돌리기 토스트)           │  ← 상세에서 삭제 후 진입 시
└──────────────────────────────────────┘
```
- 날짜 역순. 카드는 **날짜 + 그날 메인 카테고리**만 표시(운동이름 나열/세트수 요약 줄은 효용 낮아 제거, 2026-06-14).
- 메인 카테고리 = `getMainCategory` (없으면 오른쪽 빈칸).
- 카드 탭 → `/history/:id`. date picker 변경 → 해당 날짜 카드로 부드럽게 스크롤(`cardRefs`).
- 세션 삭제 후 `/history`로 돌아올 때 `location.state.undoSession`으로 10초 되돌리기.
- 저장 동기화 실패 시 기록 목록 위에 네트워크 확인 배너 표시.

### 6.3 SessionDetail — 기록 상세 `/history/:id`
```
┌──────────────────────────────────────┐
│ ←  2026년 6월 13일 (토)    [수정] [삭제] │
│    65분                                │
│ ┌────────────────────────────────────┐│
│ │ 벤치프레스   가슴                     ││
│ │ 1  80kg × 10회                  ✓   ││  ← done이면 초록 ✓
│ │ 2  80kg × 10회                      ││
│ └────────────────────────────────────┘│
│ ┌────────────────────────────────────┐│
│ │ 러닝머신   유산소                     ││  ← cardio: 2열 요약
│ │ 시간 35분   거리 5.2km               ││
│ │ 속도 8.5km/h  칼로리 338kcal         ││
│ └────────────────────────────────────┘│
└──────────────────────────────────────┘
```
- 세션 없으면 "세션을 찾을 수 없습니다" + 기록으로.
- **수정:** `/session`에 `state.date` 전달 → 해당 날짜 편집.
- **삭제:** `deleteSession` 즉시 + `/history`로 `state.undoSession` 전달(확인창 없음).
- bodyweight: `Nkg × M reps` (추가 중량, 없으면 0kg), weight: `Wkg × M reps`.

### 6.4 Weight — 무게 탭 `/weight` (2026-06-28 신설)
**목표:** 한 운동의 과거 세트(무게·횟수)를 날짜 클릭 없이 **연속 스크롤**로 한눈에 확인.

**(a) 운동 선택 화면 (selected = null)**
```
┌──────────────────────────────────────┐
│ Exercise history                  [+] │
│ Manage exercises                      │
│ [🔍 운동 검색...]                       │
│ [전체][가슴][등][어깨][팔][하체]...      │  ← 카테고리 칩 가로 스크롤
│ ┌────────────────────────────────────┐│
│ │ 벤치프레스                      가슴  ││  ← 탭하면 상세로
│ │ 스쿼트                          하체  ││
│ └────────────────────────────────────┘│
└──────────────────────────────────────┘
```
- Session의 운동추가 모달과 동일한 필터(전체+7 카테고리 + 텍스트 검색). 기록 유무와 무관하게 전체 운동 노출.
- 운동 탭 → `selected`에 해당 exercise 저장, 검색어 초기화.
- 우상단 44px + 버튼은 `Add custom exercise` 폼을 인라인으로 연다. 이름 필수, 카테고리·타입 선택, Cardio만 선택적 양수 MET 입력을 제공한다. 취소 시 저장하지 않으며 추가 후 폼을 닫고 검색어·카테고리를 초기화해 새 운동을 목록에 표시한다. 폼은 `AddExerciseForm.jsx`로 Library와 공유하고 기존 로컬 저장 경로를 사용한다.
- `Manage exercises` 링크로 기존 Library의 커스텀 운동 관리·삭제 화면에 접근한다. Settings에는 운동 관리 링크를 두지 않는다.

**(b) 상세 화면 (selected != null)**
```
┌──────────────────────────────────────┐
│ ←  벤치프레스                          │  ← 좌상단 뒤로가기 → 선택 화면
│    가슴                                │
│ 2026년 6월 13일 (토)                    │  ← 날짜 헤더
│ ┌────────────────────────────────────┐│
│ │ 1  80kg × 10회                  ✓   ││  ← 세트 단위 연속 나열 (클릭 X)
│ │ 2  80kg × 10회                  ✓   ││
│ │ 3  82.5kg × 8회                     ││
│ └────────────────────────────────────┘│
│ 2026년 6월 9일 (화)                     │
│ ┌────────────────────────────────────┐│
│ │ 1  77.5kg × 10회                ✓   ││
│ └────────────────────────────────────┘│
│            ⋮ (계속 스크롤)              │
└──────────────────────────────────────┘
```
- 세션은 날짜 역순(최근 먼저). 선택 운동을 포함하고 **세트가 1개 이상**인 세션만 표시. 없으면 "아직 이 운동의 기록이 없어요".
- 날짜 헤더 + 그 아래 세트들을 **펼쳐서 그대로** 표시(기록 탭처럼 한번 더 탭해 들어가는 구조 아님).
- 세트 표기: weight `Wkg × M reps`, bodyweight `Nkg × M reps` (추가 중량, 없으면 0kg), cardio `시간·거리·속도·경사·kcal`. `done`이면 우측 초록 ✓.
- 뒤로가기(←)로 다른 운동 선택.

### 6.5 Library — 운동 목록/커스텀 `/library`
```
┌──────────────────────────────────────┐
│ 운동 목록                     [+ 추가]  │
│ (추가 폼: 이름 / 카테고리▼ / 타입▼       │  ← +추가 토글
│         / cardio면 MET / [취소][추가])  │
│ [🔍 운동 검색...]                       │
│ [전체][가슴][등][어깨][팔][하체]...      │  ← 카테고리 칩 가로 스크롤
│ ┌────────────────────────────────────┐│
│ │ 벤치프레스  웨이트              가슴   ││  ← 기본: zinc-900
│ ├────────────────────────────────────┤│
│ │ 나만의운동 커스텀 웨이트      가슴  ×  ││  ← 커스텀: 올리브 배경/테두리
│ └────────────────────────────────────┘│     + "커스텀" 뱃지 + 삭제 ×
└──────────────────────────────────────┘
```
- 목록은 이름 가나다순 정렬, 카테고리/검색 필터.
- **커스텀 운동 시각 구별:** `id.startsWith('custom-')`이면 `bg-accent-950/50 border border-accent-800/50` + 초록 "Custom" 라벨 + 삭제(×) 버튼. **이 색상 구별은 라이브러리 화면에서만.** 운동 기록 추가(Session) 모달 리스트는 색 구별 없이 그대로.
- 추가: 이름 필수. cardio일 때만 MET 입력(양수면 저장, 아니면 null). id=`custom-uuid`.
- 기본 운동은 삭제 불가(× 없음).

### 6.6 Settings `/settings`
```
┌──────────────────────────────────────┐
│ 설정                                   │
│ ┌─ 기본 설정 ──────────────────────┐  │
│ │ 휴식 타이머 (초)                   │  │  ← 체중 필드 제거됨(2026-06-14)
│ │ [ 90 ]  (0이면 타이머 꺼짐)        │  │
│ │               [Save preferences] │  │
│ └──────────────────────────────────┘  │
│ ┌─ 데이터 내보내기 ────────────────┐  │
│ │ 전체 기록(N개 세션)을 .md로...     │  │
│ │ [ 운동 기록 내보내기 (.md) ]       │  │
│ └──────────────────────────────────┘  │
│  (상태 메시지: 저장 완료 ✓ 등)          │
└──────────────────────────────────────┘
```
- 영문 UI 섹션: `Preferences`, `Backup / Restore`, `App updates`, `Privacy`. 계정·로그아웃 UI는 없다.
- `Weight unit`에서 kg/lbs를 선택하고 `Save preferences`로 휴식 시간과 함께 저장한다. 기기 설정 키는 `wl_weight_unit`, 기본값은 kg다. Workout 입력·History 상세·Progress 기록의 무게 표기에 적용하며, 본 문서의 kg 표기 예시는 기본 설정 기준이다. kg 증감은 2.5, lbs 증감은 5다. 기존 기록과 새 입력의 내부 저장 및 Markdown 백업은 kg를 유지하고 1 lb = 0.45359237 kg로 변환한다. 표시만 소수 둘째 자리까지 반올림하며 단위 설정 변경은 기록 데이터를 수정하지 않는다. 거리·속도 및 칼로리 계산 체중은 기존 단위를 유지한다. 변환은 `src/lib/weightUnits.js`, 변환·설정 저장 테스트는 `src/lib/weightUnits.test.mjs`에 정의한다.
- Preferences에는 `Rest timer alerts` 권한 상태를 `Enabled/Disabled`로 표시한다. 최초 상태에서는 `Enable alerts`로 iOS 권한을 요청한다. 거부 상태의 `Open iPhone Settings`는 Capacitor에 등록한 `AppSettingsPlugin`을 통해 `UIApplication.openSettingsURLString`을 열고, 실패하면 수동 경로를 표시한다. 앱이 다시 활성화되면 권한 상태를 새로 확인한다.
- 내보내기: `buildMarkdown(sessions, exercises)` → `workout-YYYY-MM-DD.md`. iOS는 Cache에 파일을 만든 뒤 네이티브 Share sheet를 열고, 웹은 Blob으로 다운로드한다. 사람이 읽는 영문 보고서와 손실 없는 복원을 위한 `workout-backup:v1` JSON 메타데이터를 같은 파일에 넣는다.
- 가져오기: `.md`만 허용하고 10MB를 상한으로 둔다. 파일 전체를 검증한 뒤 미리보기에서 추가할 세션·건너뛸 날짜·새 운동 수를 보여준다. 사용자가 `Import`를 눌러야 상태를 변경한다.
- 병합: 앱은 날짜별 한 세션만 허용하므로 기존 날짜는 절대 덮어쓰지 않고 누락된 날짜만 추가한다. 같은 파일을 반복 가져오면 변경이 없다. 저장 실패 시 `Retry save`를 표시한다.
- 호환: 새 JSON 메타데이터가 있으면 `done`, 모든 세트 값, 운동 ID/type/MET를 복원한다. 이전 한국어 보고서 형식도 읽지만 파일에 없던 `done`은 `false`로, 커스텀 MET는 복원 불가로 안내한다. 손상된 메타데이터는 구형 파서로 우회하지 않고 전체 가져오기를 거부한다.
- Privacy 섹션에서 앱 내 `/privacy` 정책으로 이동한다. 공개 App Store용 정책 URL은 `https://choongchoongee-star.github.io/Workout/privacy/`이며, 데이터 미수집·기기 내 저장·사용자 선택 백업 공유·로컬 알림·삭제 정책을 명시한다.

---

## 7. 공통 컴포넌트

### Layout
- `<main>` 스크롤 컨테이너 + 하단 고정 `<nav>`(운동/기록/무게/설정).
- 경로 전환 시 스크롤 맨 위로. 단 `/session`은 스크롤 위치 보존(`scrollPositions` ref) — 운동 중 모달 닫기 등에서 위치 유지.

### StepperInput
- `[-step] [숫자 input / 단위] [+step]`. 단위는 숫자 아래에 표시한다. props: `value, onChange, step, unit, min=0, disabled`.
- `onPointerDown`으로 즉시 반응. 숫자 input은 focus/click 때 현재 값을 전체 선택해 다음 입력이 기존 값을 교체한다. 외부 value 변경 시 비포커스 상태에서만 input 동기화(입력 중 방해 X). blur 시 빈/음수면 min으로 보정. 소수 누적오차 `toFixed(2)`.

### RestTimer
- 세트 완료 시 하단(`bottom-20`) 오버레이. 원형 SVG 진행 + 가로 바. [Skip] 버튼.
- 시작할 때 `endsAt = Date.now() + restSeconds * 1000`을 저장하고, `getRemainingSeconds(endsAt)`로 표시 시간을 계산한다. 250ms 폴링 외에 `visibilitychange`, `focus`, `pageshow`에서도 즉시 다시 계산하므로 브라우저가 백그라운드 타이머를 중단해도 경과 시간이 밀리지 않는다.
- iOS에서는 타이머 시작 순간 `@capacitor/local-notifications`에 종료 시각, 기본 시스템 사운드, foreground 표시를 가진 알림 ID `1101`을 예약한다. 앱이 백그라운드 또는 중단 상태여도 iOS가 종료 순간 전달하며, 기기 무음·알림 설정에 따른 소리/햅틱 처리는 시스템에 맡긴다. 첫 예약 때 또는 Settings의 `Enable alerts`에서 알림 권한을 요청한다.
- [Skip]은 예약을 취소한다. 새 타이머는 같은 ID의 이전 예약을 취소·교체하며 generation 값으로 비동기 권한 요청 경합을 막는다. 네이티브 예약이 성공한 경우 타이머 종료 effect는 Web Audio를 중복 재생하지 않는다.
- 웹/PWA에서는 Web Audio로 0.25초 톤을 1회 재생하고, 오디오 시작이 실패하면 지원 브라우저에서 250ms 진동을 1회 요청한다. 이는 브라우저를 떠나 있는 동안의 즉시 알림을 보장하지 않으며 iOS 앱의 네이티브 알림이 정식 동작이다.

### UndoToast
- 10초 카운트다운 진행 바. [되돌리기] → onUndo+onDismiss. 자동 만료 시 onDismiss. `bottomOffset` 커스터마이즈 가능(기본 `5rem`). `animate-slide-up`.

---

## 8. 핵심 로직

### 8.1 (제거됨) 점진적 과부하 제안
- 과거 "3회 연속 동일 무게 → +2.5kg 올려보세요" 배너 + `epley.js`는 **2026-06-28 제거**.
- 대신 **이전 값 자동 입력(8.4)** 으로 마지막 무게를 첫 세트 기본값에 넣어주는 기능만 유지.

### 8.2 칼로리 (`calories.js` → calcCalories)
```
kcal = round( MET × 체중(kg) × (분/60) )
```
- 인자 중 null/0 이하 있으면 null. 체중은 `storage.getBodyWeight()`(기본 70).

### 8.3 메인 카테고리 (`sessionUtils.js` → getMainCategory)
- 세션 내 운동들의 카테고리 빈도 최다를 반환. 동률이면 **먼저 등장한** 카테고리. 운동 없으면 null.
- 사용처: History 카드 우측, Session 추가 모달 기본 카테고리.

### 8.4 이전 값 자동 입력 (`AppContext.getLastSession`)
- `(exerciseId, excludeDate)` → 그 운동을 포함하는, 오늘이 아닌 가장 최근 세션. 첫 세트 기본값 채울 때 사용.

### 8.5 자동 저장 / 디바운스 (`AppContext`)
- `LOAD_START`로 로컬 JSON을 읽으며, 완료 전에는 Session/History 등 자식 화면을 마운트하지 않는다. 따라서 오늘 화면이 초기 빈 `sessions`를 캡처하거나 사용자가 로딩 중 빈 상태를 편집하는 일을 막는다.
- 로드 성공 시 데이터와 함께 `loaded=true`, `syncing=false`로 전환한다. 개발 모드 이중 실행 뒤 늦게 도착한 응답은 effect cleanup의 `cancelled` 플래그로 무시한다.
- 로드 실패 시 빈 배열로 대체하지 않고 `LOAD_ERROR`로 진입한다. 손상되었거나 읽을 수 없는 기존 파일을 빈 데이터로 덮어쓰지 않도록 편집 화면 대신 오류와 [Try again]을 표시한다.
- 정상 로드 직후 첫 저장 effect는 `justLoadedRef`로 1회 스킵한다. 이후 state 변경은 500ms 디바운스 후 `saveLocalWorkoutData`로 전체 JSON을 저장한다.
- 저장 실패는 `syncError`로 보존하며 Session·History·Library 화면에 기기 저장 오류 배너를 표시한다. 다음 저장 시작 시 오류를 초기화한다.

### 8.6 소요시간
- 오늘 세션 첫 진입 시 sessionStorage에 시작 ms 기록. **자동저장(디바운스)마다** `(now-start)/60000` 반올림(최소 1분)을 `duration_min`에 저장 → 마지막 활동 시각이 곧 세션 길이. 다른 날 편집은 duration=null. (완료 버튼 제거 전에는 [완료] 시점에만 계산했음, 2026-06-14 변경)

### 8.7 iOS 네이티브 셸
- `ios/App.xcodeproj`는 Capacitor v8로 생성했으며 앱 번들에 `dist` 웹 자산을 포함한다. 원격 사이트를 불러오는 단순 WebView가 아니다.
- `@capacitor/filesystem`, `@capacitor/local-notifications`, `@capacitor/share`를 Swift Package Manager 프로젝트에 연결한다. `npm run ios:sync`가 iOS용 상대경로 빌드와 플러그인/자산 동기화를 수행한다.
- `PrivacyInfo.xcprivacy`를 App target의 Copy Bundle Resources에 포함하고 Filesystem의 file timestamp API 사용 이유 `C617.1`을 선언한다. 수집 데이터와 추적은 없음으로 선언한다.
- iOS AppIcon은 불투명 RGB 1024×1024 정사각형 자산이며 시스템 마스크용 모서리 여백이나 투명 영역을 포함하지 않는다. 앱은 iPhone 전용·세로 방향으로 고정한다.
- iOS 빌드는 PWA 서비스워커를 포함하지 않는다. 앱 UI와 데이터 접근은 오프라인으로 동작하며 로그인 화면이나 Firebase SDK가 없다.
- 콘텐츠는 CSS `env(safe-area-inset-top)` 아래에서 시작하고, 하단 내비게이션과 휴식 타이머는 `env(safe-area-inset-bottom)`을 포함해 홈 인디케이터와 겹치지 않는다.
- Windows에서는 Swift 컴파일, Xcode archive와 서명 검증을 수행할 수 없다. 최초 EAS 빌드에서 Swift 브리지와 SPM archive를 확인하고, 실제 iPhone에서 알림 권한·설정 바로가기·백그라운드 알림·safe area·파일 가져오기/공유를 검증해야 한다.

---

## 9. 기본 운동 목록 (`exercises.js`, 61개 / 7카테고리)

- **Chest(13):** Bench Press, Incline Bench Press, Decline Bench Press, Dumbbell Fly, Cable Crossover, Dips(bw), Push-up(bw), Pec Deck Fly, Cable Dips, Incline Dumbbell Press, Chest Press, Assisted Dip, Cable Chest Press
- **Back(9):** Pull-up(bw), Lat Pulldown, Seated Row, One-arm Dumbbell Row, Deadlift, T-bar Row, Cable Row, Assisted Chin-up, Straight-arm Pulldown
- **Shoulders(8):** Overhead Press, Dumbbell Shoulder Press, Lateral Raise, Front Raise, Face Pull, Upright Row, Shoulder Press, Reverse Pec Deck Fly
- **Arms(8):** Barbell Curl, Dumbbell Curl, Hammer Curl, Preacher Curl, Triceps Pushdown, Overhead Triceps Extension, Skull Crusher, EZ-bar Curl
- **Legs(9):** Squat, Leg Press, Lunge, Leg Extension, Leg Curl, Hip Abduction, Calf Raise, Romanian Deadlift, Thigh Abduction
- **Core(7):** Crunch(bw), Leg Raise(bw), Plank(bw), Cable Crunch, Hanging Leg Raise(bw), Ab Wheel Rollout(bw), Back Extension
- **Cardio(7, MET):** Treadmill 8.3, Cycling 8.0, Rowing Machine 7.0, Elliptical 5.0, Jump Rope 10.0, Walking 3.5, Stair Climber 9.0
- `CATEGORIES = ['Chest','Back','Shoulders','Arms','Legs','Core','Cardio']`
- `LEGACY_EXERCISE_NAMES`와 `LEGACY_CATEGORIES`는 한국어 저장 데이터/백업을 영문 기본 정의로 연결한다. ID만 같고 사용자가 이름을 임의 변경한 운동은 이름을 강제로 덮어쓰지 않는다.

---

## 10. 디자인 시스템

- **테마:** 사용자 지정 4색 `#1D4533`(짙은 초록), `#F7EAE0`(크림), `#F9D2BA`(살구), `#5E3122`(갈색)의 밝은 테마, `color-scheme: light`. `src/index.css`의 @theme에서 앱 전체 색상을 정의한다. 배경 `zinc-950 #f7eae0 / 900 #fcf4ee / 800 #f9d2ba`, 선 `700 #c5ac9e`, 보조 텍스트 `600 #846657 / 500 #765b4d / 400·300 #5e3122 / 200 #1d4533`, 본문 `white #1d4533`. 기존 클래스명을 재사용하지만 실제 색상은 이 토큰을 따른다. 웹 preview manifest도 크림 배경이다.
- **포인트 컬러:** `accent-600·400 #1d4533`(주요 버튼·링크·완료), `accent-500 #2e5d47`(진행 바·포커스), `accent-300·700 #153627`(눌림), `accent-800 #51715a`, `accent-950 #dce4d9`. 주요 버튼은 초록 배경과 크림 글자다. 하단 탭도 초록 배경이며 선택 표시는 살구색이다. 큰 숫자 입력창과 설정에 같은 팔레트를 적용한다.
- **상태색:** 세트 완료와 성공·알림 허용은 짙은 초록, 오류·위험은 짙은 적갈색 `red-300/400/500 #8a3228`, 경고는 갈색 `amber-200/300/400 #5e3122`. 상태 배너 배경은 연한 초록 또는 살구색이며 밝은 배경에서 기존의 옅은 상태 글자가 흐려지지 않도록 토큰을 조정한다.
- **커스텀 운동(라이브러리 전용):** `bg-accent-950/50 + border-accent-800/50`.
- **모양:** Workout은 얇은 선 목록. 다른 카드 `rounded-2xl`은 12px, `rounded-xl`은 8px로 정의하며 칩은 full을 허용한다. 모달은 바텀시트(`rounded-t-2xl mt-auto`).
- **숫자 조절과 확대:** 기록 목록의 각 무게·횟수에 ±를 항상 표시한다. 이 반복 버튼은 앱의 빠른 조작을 위한 핵심 기능이며 디자인 단순화를 이유로 숨기지 않는다. 무게·횟수 모두 열 중앙의 최대 112px 영역을 사용하며 숫자는 위, 44px 폭 ± 버튼은 아래에 배치한다. 큰 숫자 dialog는 선택적 보조 입력이다. 확대 시 최소 18.5rem의 표 너비를 보존하고 표 영역의 가로 스크롤로 버튼 겹침을 방지한다. dialog는 최대 384px, 작은 화면에서는 좌우 16px 여백을 두며 native focus trap과 Escape를 지원한다. viewport의 maximum-scale/user-scalable 제한을 제거해 사용자 확대를 허용한다. 200% 루트 글자 크기에서 조절창 열기·닫기를 브라우저로 확인했다.
- **인터랙션:** 모바일이라 hover 대신 `active:` 사용. 가로 스크롤 칩 `no-scrollbar`.
- **애니메이션:** `animate-slide-up`(토스트), `animate-pulse`(스켈레톤/동기화).
- **접근성:** 모달 `role="dialog" aria-modal`, Escape 닫기 + Tab 포커스 트랩, 아이콘 버튼 `aria-label`, 세트 완료 `aria-pressed`.

---

## 11. Phase 계획

### ✅ Phase 1 — MVP
- [x] 웨이트 + 유산소 기록 / 유산소 수동 기록 / PWA

### ✅ Phase 2 — 점진적 과부하 (이후 롤백)
- [x] +2.5kg 제안 배너 → **2026-06-28 제거** (이전 값 자동 입력만 유지)

### ✅ Phase 3 — 무게 탭
- [x] 운동별 과거 세트 연속 조회 화면 (2026-06-28)

### ✅ Phase 4 — 로컬 전용 iOS 앱
- [x] Firebase·Google 로그인 제거 / 기기 파일 자동 저장 / Capacitor Xcode 프로젝트 / 백그라운드 로컬 알림 / iOS 공유 시트 백업
- [x] iPhone 전용 세로 고정 / 정식 불투명 아이콘 / 알림 권한 Settings / 손상 시 로컬 백업 복구 / 개인정보처리방침
- [x] EAS 프로젝트 연결 / Capacitor-SPM Custom Build / 공유 Scheme / 출시 설정 정적 검사
- [x] 자체 호스팅 OTA 다운로드·서명 검증·다음 시작 적용 / 실패 시 내장 버전 복구 / 로컬 배포 파일 생성
- [x] OTA 파일·변경된 공개 개인정보처리방침 및 iPhone 소개 사이트 게시 (2026-09-05)
- [ ] TestFlight 실기기 OTA 검증
- [x] EAS Release archive·서명·IPA 생성 (build 4)
- [x] 빌드 4 App Store Connect/TestFlight 업로드
- [ ] Apple 처리 완료 확인, 실기기 검증, App Store 메타데이터와 제출

---

## 12. Out of Scope (의도적 제외)

- 다중 사용자 / 소셜 기능
- 분석 차트 / 통계
- 바코드 / 외부 DB 운동 검색
- 서버 기반 푸시 알림 / 운동 리마인더 (휴식 종료 로컬 알림은 제공)
- InBody / 체성분 분석 (과거 제거)
- Epley 1RM 표시 (과거 제거)
- Gemini Vision API 사진 인식 (과거 제거)
- 홈 화면 / 카테고리 기반 운동 시작 모달 (2026-06-13 제거)
- 체중 설정 UI (2026-06-14 제거 — 칼로리는 기본 70kg)
- 점진적 과부하(+2.5kg) 제안 배너 (2026-06-28 제거)

---

## 13. 유지보수 이력

- Phase 1~2 구현 완료
- InBody, Gemini Vision, Epley 1RM 표시 등 불필요 기능 제거 후 운동 기록에 집중
- 유지보수 13회 세션 수행: 63개 항목 검수 (23 pass / 20 fixed / 20 reported)
- ESLint 경고 전체 해결, 접근성 개선 (키보드 포커스 트랩, aria 속성 등)
- 2026-06-13: 홈 탭 삭제(기록 탭과 역할 중복). 기본 진입을 운동 탭으로 변경, 카테고리 기반 시작 모달 및 관련 유틸(getLatestCategoryExerciseIds) 제거
- 2026-06-14: 기록 탭 목록 카드 간소화 — 운동 이름/요약 줄 제거
- 2026-06-14: 운동 추가 모달 자동 포커스 제거 / 기록 카드 우측에 그날 메인 카테고리 표시 / 설정 체중 필드 제거 / 라이브러리 커스텀 운동 색상·뱃지 구별(라이브러리 한정)
- 2026-06-14: SPEC.md를 재구성 수준(와이어프레임 포함)으로 전면 보강
- 2026-06-14: 운동 탭 UX 3종 — 세트 추가 시 새 세트로 자동 스크롤 / [+ 운동 추가] 버튼 상단→하단 이동 / [완료] 버튼 제거(자동저장이 소요시간까지 처리하도록 이관)
- 2026-06-14: 운동 추가 시에도 새 운동 카드로 자동 스크롤 (SPEC '맨 위' 표현을 실제 동작인 '맨 아래'로 정정)
- 2026-06-28: **무게 탭 신설**(운동/기록/무게/설정 4탭). 운동 선택 → 과거 세트를 날짜별로 연속 스크롤 조회(클릭 없이). 점진적 과부하 제안 배너 + epley.js 제거(이전 값 자동 입력은 유지)
- 2026-08-21: 앱 시작 시 Firestore 데이터 로드가 끝날 때까지 편집 화면 마운트를 보류. 로드 실패를 빈 기록으로 대체하지 않고 재시도 화면을 표시하며, 늦게 도착한 비동기 응답을 무시하도록 보강. 성공 시 동기화 상태 정상 종료 및 History 저장 오류 배너 추가.
- 2026-09-04: Markdown 가져오기 추가. 신규 백업은 숨은 JSON 메타데이터로 손실 없이 복원하며, 기존 한국어 내보내기 파일도 지원한다. 기존 날짜 보존, 미리보기, 중복 방지, 저장 재시도를 포함한다.
- 2026-09-04: 사용자 백업에서 확인한 13종을 기본 운동으로 승격해 기본 목록을 61종으로 확장. 과거 커스텀 ID와 세션 참조를 유지한다.
- 2026-09-04: 앱의 사용자 노출 언어, 날짜, 기본 운동·카테고리, 새 Markdown 형식을 영어로 전환. 기존 한국어 Firestore 데이터와 Markdown 백업은 로드/가져오기 시 영어 정의로 정규화한다.
- 2026-09-04: 프로젝트 전용 `workout-maintenance` 스킬 추가. 구현 작업 종료 시 SPEC 동기화, 검증, 민감 파일 제외, 커밋·`master` 푸시와 원격 해시 확인을 필수 절차로 지정한다. GitHub Pages 배포는 별도 작업으로 유지한다.
- 2026-09-04: 스테퍼 숫자 탭 시 전체 선택해 즉시 덮어쓰도록 개선. 휴식 타이머를 절대 종료 시각 기준으로 바꿔 백그라운드 복귀 오차를 제거하고, 종료 1회 소리와 오디오 실패 시 1회 진동을 추가했다. iOS 앱은 단순 WebView 대신 Capacitor 네이티브 셸과 서버 없는 로컬 알림을 후속 방향으로 결정했다.
- 2026-09-04: Capacitor v8 iOS Xcode 프로젝트로 전환. Firebase SDK·Google 로그인·계정 UI를 제거하고 iOS 앱 전용 JSON 파일에 자동 저장하도록 변경했다. 휴식 시작 시 iOS 로컬 알림을 예약해 앱이 백그라운드여도 종료 순간 시스템이 알리며, Markdown 백업은 네이티브 공유 시트를 사용한다.
- 2026-09-05: 파란 덤벨 기반의 불투명 정식 AppIcon으로 교체하고 iOS target을 iPhone 전용·세로 방향으로 고정했다. Settings에 휴식 알림 권한 상태와 요청/거부 안내를 추가했다.
- 2026-09-05: pending 검증과 직전 정상 backup을 이용한 로컬 데이터 자동 복구를 추가했다. 앱 내 영문 개인정보처리방침과 GitHub Pages 공개 정책 페이지를 추가하고, 원격 iOS 빌드는 준비 완료 후 EAS Custom Build로 실행하도록 배포 계획을 갱신했다.
- 2026-09-05: EAS 프로젝트를 연결하고 Capacitor/SPM용 production Custom Build, 공유 App Scheme, 버전·번들·암호화 출시 설정 검사기를 추가했다. 알림 거부 시 앱별 iPhone Settings를 직접 여는 네이티브 브리지와 iPhone safe area 보정도 추가했다.
- 2026-09-05: 운동 입력·기록 상세·Progress 화면에서 맨몸 운동의 `BW +`/`Bodyweight+` 접두어를 제거했다. 추가 중량 데이터와 Markdown 백업 형식은 유지한다.
- 2026-09-05: GitHub Pages를 iPhone 앱 소개·지원·개인정보처리방침 사이트로 전환했다. 기존 PWA 자산은 제거하고 서비스워커 해제 파일을 게시했다. OTA manifest와 서명 ZIP을 게시하고 공개 응답·체크섬·서명을 확인했다. EAS는 실행하지 않았다.

- 2026-09-05: 원격 빌드 `f7825767-02cf-4da0-88a7-61e706e85ec6` (build 2)는 Node 18.18.0에서 Vite 실행 중 `CustomEvent is not defined`로 실패했다. production 환경을 Node 24.13.0과 `macos-tahoe-26.5-xcode-26.6`으로 명시했다. Swift 컴파일·archive·TestFlight 제출은 아직 검증되지 않았다.
- iOS sync 어댑터는 CLI가 Xcode 프로젝트 기준으로 생성한 SPM 경로를 실제 Package.swift 위치 기준으로 보정하고 각 의존성의 Package.swift 존재를 확인한다. 출시 검사기는 build number 일치와 Node/Xcode 최소 버전도 검사한다. 새 native runtime `ios-edab217484237bd7`의 OTA 게시도 별도 승인 후 진행한다.

- 2026-09-05: 재빌드 사전 점검에서 앱 내부 Swift 브리지 override의 불필요한 open 접근 지정자를 제거했다. 배포 전 별도 checkout에서 npm ci, Capacitor sync와 출시 검사를 수행한다.

- 2026-09-05: 기존 테스트 37개, lint, 웹 빌드 및 별도 checkout의 npm ci·iOS sync·출시 검사를 통과했다. 비대화형 EAS는 `EAS_BUILD_AUTOCOMMIT=1`로 버전 증가 커밋을 허용한다. 승인된 원격 재빌드 ID는 `81cb98f8-4a54-46db-ab07-8bc7d08c50b8`이며 build number 3을 사용한다. npm audit 경고는 남아 있으며, 서버 렌더링을 사용하지 않는 앱의 실제 영향과 도구 의존성 갱신을 별도 검토한다.

- 2026-09-05: build 3은 sharp 0.34.5가 소스 빌드를 시도하며 node-addon-api 누락으로 npm ci에서 실패했다. EAS production env에 `SHARP_IGNORE_GLOBAL_LIBVIPS=1`을 추가해 서버의 전역 libvips 감지를 끄고 macOS 사전 컴파일 패키지를 사용하도록 한다. https://sharp.pixelplumbing.com/install/ 의 공식 설치 설정을 적용했다. 이 수정의 macOS 원격 검증과 Swift archive는 아직 미완료이며 추가 빌드에는 별도 승인이 필요하다.

- 2026-09-05: 승인된 build 4 (`8dbb3032-b99b-43aa-be0c-47c1e82b4ed7`)가 성공했다. sharp 설치·웹 생성·Capacitor sync·SPM 컴파일·Release archive·서명과 IPA 업로드까지 완료했다. 빌드 페이지: https://expo.dev/accounts/choongchoongee/projects/workout-logger/builds/8dbb3032-b99b-43aa-be0c-47c1e82b4ed7 . TestFlight 제출과 실기기 검증은 아직 미완료다.

- 2026-09-05: 빌드 4의 EAS Submit `a8e1b355-f9a3-4c10-bac7-e325b5121335`가 성공해 App Store Connect 업로드를 완료했다. Apple 처리 완료·테스터 설치는 아직 확인하지 않았다. ASC 앱 ID `6808960698`을 eas.json에 저장했고, TestFlight 주소는 https://appstoreconnect.apple.com/apps/6808960698/testflight/ios 이다. 기존 이름 중복으로 EAS가 등록한 ASC 이름은 `Workout Logger (156938)`이며 정식 출시 전 최종 이름을 정해야 한다. 내부 테스트 그룹 `Team (Expo)`가 생성됐고 소유자 계정에 접근 권한이 설정됐다.

- 2026-09-05: 커스텀 운동 추가를 Settings에서 Progress 우상단 + 버튼으로 이동했다. 기존 폼을 공유 컴포넌트로 추출했고 Progress에서 직접 추가·취소 및 운동 관리 화면 접근을 제공한다. 이번 UI 변경은 소스 반영이며 OTA 게시·EAS 빌드는 실행하지 않았다.

- 2026-09-05: 사용자 승인으로 Progress + 커스텀 운동 추가 UI (`af1c6ae`)를 빌드 4 runtime `ios-edab217484237bd7`에 OTA 게시했다. bundle ID `6bf8277690f5641b7817c830de357f4bd4c7996912331d61a647b6dd45aebf03`, ZIP 381610 bytes. 공개 manifest·ZIP 응답 및 SHA-256·RSA 서명을 검증했다. iPhone Settings → Check for updates에서 다운로드 후 앱을 완전히 종료·재실행해 적용하며 실제 기기 적용 여부는 별도 확인한다. 새 EAS 빌드는 실행하지 않았다.

- 2026-09-05: Settings 하단의 전체 폭 Save 버튼을 Preferences 카드 내부 하단으로 이동했다. 구분선 아래 우측에 44px 이상 터치 영역의 작은 파란 `Save preferences` 버튼을 배치하고 저장 완료 문구도 버튼 옆에 표시한다. 저장 범위는 기존 휴식 시간 설정이며 백업·업데이트·Privacy와 분리된다. 소스 반영만 수행하며 이 변경의 OTA 배포는 별도 승인 후 진행한다.

- 2026-09-05: iPhone Workout 세트 입력 줄이 카드 밖으로 넘치는 문제를 수정했다. 무게·횟수 입력기는 최소 9rem 반응형 grid로 배치하고 공간이 부족하면 세로로 전환한다. 각 입력기는 44px 증감 버튼과 min-width 0 숫자 영역을 사용하며 kg/reps 단위를 숫자 아래에 표시한다. lint·웹 빌드로 검증했으며 실제 iPhone 확인과 OTA 배포는 아직 수행하지 않았다.

- 2026-09-05: 사용자 승인으로 Preferences 저장 버튼 이동과 Workout 입력기 넘침 수정 (`b57a661`)을 OTA 게시했다. runtime `ios-edab217484237bd7`, bundle `c8bd7b793c9b2b2497dfb2d6c8a6bc087c54f3cb19ed4b4ae71efd98eb94b1bb`, ZIP 381860 bytes. OTA 테스트 7개·native 호환 검사·공개 manifest 및 ZIP SHA-256/RSA 검증을 통과했다. 새 EAS 빌드는 실행하지 않았으며 실제 iPhone 적용 확인은 남아 있다.

- 2026-09-05: Workout 세트 행을 약 69px로 축소했다. 번호·단위·완료·삭제 줄과 무게/횟수 고정 2열 입력을 사용해 작은 화면에서도 5세트를 표시한다. Preferences에 kg/lbs 선택을 추가하고 입력·History 상세·Progress에 환산 적용했다. 기존 기록 및 Markdown 백업의 kg 저장은 유지한다. 단위 변환·기기 설정을 포함한 테스트 39개, lint, build 및 브라우저 4개 너비의 레이아웃·증감·완료 잠금·lbs 저장/재로드를 검증했다. OTA 게시와 EAS 실행은 별도다.

- 2026-09-05: 세트 입력 UI를 열 정렬 방식으로 다듬었다. 숫자·증감을 한 입력 영역으로 묶고 44px 완료 버튼을 별도 열로 분리했다. 삭제는 카드 Edit 모드에만 표시하며 입력과 완료를 잠가 실수로 삭제하는 동선을 분리했다. 약 70px 행 높이와 5세트 표시를 유지하며 4개 화면 너비, 단위 저장, 완료 잠금, 편집 진입/종료 및 삭제/Undo를 브라우저에서 검증했다. 원격 푸시는 앞선 자동 승인 검토 차단으로 사용자 승인 대기이며 앱 배포는 수행하지 않았다.

- 2026-09-05: 상자형 세트 UI와 Edit 모드를 제거하고 33px 높이의 한 줄 목록으로 변경했다. 삭제 휴지통은 행 왼쪽에 상시 표시하고 완료는 오른쪽에 분리했다. 무게·횟수는 −/숫자/+를 나란히 배치한다. 운동 2개 × 5세트를 4가지 화면 너비에서 검증했으며 세트·운동 삭제/Undo, 완료 잠금, kg/lbs와 맨몸 추가 중량 저장/재로드를 확인했다. lint·build 통과, 원격 푸시와 앱 배포는 미실행이다.

- 2026-09-05: 앱 전체에 차콜·오프화이트·절제된 라임 팔레트를 적용하고 공통 @theme 색상·반경 토큰으로 통합했다. 주요 버튼은 라임 배경·차콜 글자이며 탭·타이머·완료 표시는 같은 accent 토큰을 사용한다. 스테퍼를 열 중앙의 최대 100/80px 영역으로 모아 ±를 숫자 가까이 배치했다. 4개 너비의 10세트 레이아웃, 운동 입력·삭제/Undo·kg/lbs 저장 및 Settings/History/Progress 화면, lint·build를 검증했다. 앱 아이콘과 원격 배포는 변경하지 않았다.

- 2026-09-05: 읽기 중심의 운동 목록으로 단순화했다. 18px 숫자 버튼과 큰 조절 dialog로 반복 ±를 대체하고 Apply/Cancel 초안 처리를 추가했다. 삭제 버튼은 유지하면서 Undo를 10초로 늘리고 화면 확대 제한을 해제했다. 10세트·4개 화면 너비, 조절·적용·취소·유효성·Escape·완료 잠금·지연 Undo·lbs 재로드 및 200% 글자 상태를 검증했다. 테스트 39개·lint·build 통과. 실제 iPhone 사용성 확인과 앱 배포는 별도다.

- 2026-09-05: 사용자 핵심 원칙에 따라 반복 ± 버튼을 모든 세트에 상시 복원했다. 즉시 증감·자동 저장을 유지하고 큰 숫자 dialog는 직접 입력 보조 기능으로 남겼다. 33px 행과 10세트 표시, 큰 글자·삭제/완료 분리·10초 Undo를 유지한다. 확대 시 표 내부 가로 스크롤로 숫자 버튼이 눌리지 않는 문제를 방지했다. 직접 kg/reps 증감, 기존 dialog/Undo/단위 저장, 4개 너비와 200% 글자 확대, lint·build를 검증했다. 원격 푸시 및 앱 배포는 별도다.

- 2026-09-05: 사용자 승인으로 최종 디자인과 상시 ±·kg/lbs·큰 숫자 보조 입력·10초 Undo (715ed32)를 기존 iOS runtime ios-edab217484237bd7에 OTA 게시했다. bundle adcef8daa29e3cd7cc1f2656f04c73f19c6e31158101b576e7c3a25f598df6f7, ZIP 383326 bytes. OTA 테스트 7개, native fingerprint 일치, 새 Capacitor 빌드, 로컬 및 공개 manifest/ZIP SHA-256·RSA 서명 검증을 통과했다. 게시 범위는 gh-pages의 해당 runtime 경로이며 EAS나 새 네이티브 빌드는 실행하지 않았다. Settings → Check for updates에서 다운로드 후 완전 종료·재실행으로 적용하며 실제 iPhone 적용 여부는 별도 확인한다. master 소스 푸시는 앞선 승인 검토 차단으로 대기 중이다.

- 2026-09-05: 사용자 첨부 팔레트의 #1D4533·#F7EAE0·#F9D2BA·#5E3122를 앱 전체에 적용했다. 크림 배경·초록 본문/주요 버튼·살구 보조 배경·갈색 보조 글자로 전환하고, 하단 탭은 초록 배경/살구 선택 표시다. 밝은 배경에 맞게 상태색과 color-scheme, 웹 manifest를 갱신했다. 상시 ±와 33px 행을 유지하고 4개 너비의 10세트·직접 증감·조절창·삭제/Undo·lbs 저장·200% 글자 확대 및 설정 화면, lint·build를 검증했다. 이번 팔레트의 OTA는 아직 게시하지 않았다.

- 2026-09-05: 한 운동 5세트가 화면의 약 80%를 쓰도록 행 높이를 확대하고 ±·완료·삭제를 최소 44×44px 클릭 영역으로 변경했다. 숫자는 24px, ±는 숫자 아래에 상시 표시하며 상자 배경 없이 구분선 목록을 유지한다. 휴지통을 ×로 교체하고 왼쪽 삭제/오른쪽 완료 배치를 유지했다. 4개 화면 크기의 약 80% 비율·첫 5세트 표시·버튼 크기, 직접 증감·보조 입력·삭제/Undo·lbs 저장·200% 확대, lint·build를 검증했다. OTA는 아직 게시하지 않았다.

- 2026-09-05: Settings의 Backup / Restore를 App updates 위로 이동했다. 섹션 순서는 Preferences → Backup / Restore → App updates → Privacy다. 각 기능과 스타일은 유지한다.
