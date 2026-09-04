# Workout Logger — 기획서 (재구성용 마스터 스펙)

> 마지막 업데이트: 2026-09-05
> 현재 Phase: Phase 4 (로컬 전용 iOS 전환) 구현 완료 — EAS 설정·실기기 검증 대기
> 본 문서는 **이 문서만으로 동일한 앱을 처음부터 재구성**할 수 있도록 작성한다. 화면별 와이어프레임·데이터 모델·핵심 로직·디자인 토큰을 모두 포함한다.

> **언어 규칙:** 사용자에게 표시되는 앱 UI, 날짜, 기본 운동 이름·카테고리, 오류 메시지, 새 Markdown 내보내기는 모두 영어다. 과거 Firebase 데이터에서 내보낸 백업과 2026-09-03 이전 한국어 Markdown 백업은 가져올 때 영어 기본 운동으로 정규화한다. 본 문서의 한국어 설명은 개발 문서용이며, 와이어프레임에 남은 한국어 표현보다 이 규칙과 실제 영문 UI 문구가 우선한다.

---

## 1. Overview

- **목적:** 웨이트 + 유산소 운동 세션을 최소 마찰로 기록하는 개인용 iOS 앱
- **핵심 철학:** "운동 중에 빠르게 기록" — 탭 수 최소화, 자동 입력(이전 값 재사용), 자동 저장
- **핵심 제약사항:** 로그인·백엔드 서버·원격 데이터 전송 없음, 기기 내 저장, 1일 1세션
- **주요 사용자:** Charlie (단일 사용자, 개인용)
- **플랫폼:** Capacitor 기반 iOS 앱 우선. 동일 React 앱의 브라우저/PWA 빌드도 개발·미리보기용으로 유지. 세로형 `max-w-lg`, 다크 테마 고정

---

## 2. 기술 스택 & 빌드/배포

### 스택
- **React 19** + **Vite 8** (`@vitejs/plugin-react`)
- **Tailwind CSS v4** (`@tailwindcss/vite` 플러그인 방식 — `tailwind.config` 없이 CSS-first)
- **react-router-dom v7** (`BrowserRouter`, `basename="/Workout"`)
- **Capacitor v8** — iOS 네이티브 셸, Filesystem, Local Notifications, Share
- **vite-plugin-pwa v1** (`registerType: 'autoUpdate'`, Workbox `generateSW`)
- 앱 아이콘: 불투명 1024×1024 iOS AppIcon + 동일 디자인의 PWA 192/512 아이콘

### vite.config.js 핵심
```js
base: mode === 'capacitor' ? './' : '/Workout/',
mode !== 'capacitor' && VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Workout Logger', short_name: 'Workout',
    theme_color: '#09090b', background_color: '#09090b',
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
| `lint` | `eslint .` |
| `preview` | `vite preview` |
| `icons` | `node generate-icons.mjs` (PWA 아이콘 생성) |
| `deploy` | `npm run build && gh-pages -d dist` |

### 배포 (중요)
- **자동 CI 없음.** `master` 푸시는 소스만 올라감.
- 라이브 반영은 **수동으로 `npm run deploy`** 실행 → `dist/`를 `gh-pages` 브랜치로 push → GitHub Pages 서빙.
- 라이브 URL: `https://choongchoongee-star.github.io/Workout/`
- PWA 서비스워커(`autoUpdate`)가 새 빌드를 백그라운드 갱신하므로, 배포 후 기기에서는 앱 재실행 1~2회 또는 잠깐의 지연 후 반영됨.
- iOS 앱은 `npm run ios:sync` 후 `ios/App/App.xcodeproj`를 빌드한다. App Store용 원격 빌드·서명은 Capacitor/SPM에 맞춘 EAS Custom Build를 사용할 예정이며, 설정과 실기기 체크리스트가 준비된 뒤에만 실행한다. 앱 ID 기본값은 `com.choongchoongeestar.workout`이다.
- iOS target은 iPhone(`TARGETED_DEVICE_FAMILY=1`) 전용이며 세로 방향만 지원한다.
- 앱은 Firebase 환경변수나 서버 자격 증명을 사용하지 않는다.

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
│   │   ├── StepperInput.jsx  # -/+ 숫자 스테퍼
│   │   ├── RestTimer.jsx     # 휴식 타이머 (원형 진행 + 바)
│   │   └── UndoToast.jsx     # 5초 되돌리기 토스트
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
│   │   └── storage.js        # localStorage 설정값 (휴식 시간, 체중 기본값)
│   ├── data/
│   │   └── exercises.js      # DEFAULT_EXERCISES(61개), 영문 카테고리 + 한국어 호환 별칭
│   └── ...
├── ios/                      # Capacitor Xcode 프로젝트 + 번들 웹 자산
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
- 런타임 서버 의존성 없음. iOS 네이티브 기능은 앱에 포함된 Capacitor 공식 플러그인만 사용한다.

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
- 활성 탭 `text-blue-400`, 비활성 `text-zinc-500`.
- 라이브러리(`/library`)는 탭 없음 — 설정에서 진입.

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
│ │ 벤치프레스                        ×  ││  ← 운동 카드 (최신이 아래, 추가 시 자동 스크롤)
│ │ 가슴                                ││
│ │ 1세트            [✓]  [×]           ││  ← 세트행 1줄
│ │ [-2.5] 80 kg [+2.5] [-1] 10 회 [+1] ││  ← 세트행 2줄 (StepperInput ×2)
│ │ 2세트 ...                           ││
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
- **숫자 덮어쓰기:** weight·added weight·reps 스테퍼의 숫자 input을 탭하거나 클릭하면 기존 값을 전체 선택한다. 이어서 숫자를 입력하면 기존 값을 따로 지우지 않고 바로 교체된다. 값을 바꾸지 않고 포커스만 벗어나면 원래 값은 유지한다.
- **세트 완료(✓):** 토글. 미완료→완료로 바뀔 때만 휴식 타이머 시작(해제 시엔 안 켜짐). 완료 시 행 잠금(opacity↓, 입력 disabled).
- **bodyweight:** "체중+" 레이블 + added_weight 스테퍼(step 2.5) + reps.
- **cardio:** 카드에 폼(시간/거리/속도/경사 number input 2열 + 칼로리). duration·met 있으면 칼로리 자동계산(수정 가능), met 없으면 수동 입력 안내.
- **삭제:** 세트/운동 ×버튼 → 즉시 제거 + UndoToast(5초). 되돌리기 시 원위치 복원.
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
- 세션 삭제 후 `/history`로 돌아올 때 `location.state.undoSession`으로 5초 되돌리기.
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
- bodyweight: `체중+Nkg × M회`, weight: `Wkg × M회`.

### 6.4 Weight — 무게 탭 `/weight` (2026-06-28 신설)
**목표:** 한 운동의 과거 세트(무게·횟수)를 날짜 클릭 없이 **연속 스크롤**로 한눈에 확인.

**(a) 운동 선택 화면 (selected = null)**
```
┌──────────────────────────────────────┐
│ 무게 기록                              │
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
- 세트 표기: weight `Wkg × M회`, bodyweight `체중+Nkg × M회`, cardio `시간·거리·속도·경사·kcal`. `done`이면 우측 초록 ✓.
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
│ │ 나만의운동 커스텀 웨이트      가슴  ×  ││  ← 커스텀: 파란 배경/테두리
│ └────────────────────────────────────┘│     + "커스텀" 뱃지 + 삭제 ×
└──────────────────────────────────────┘
```
- 목록은 이름 가나다순 정렬, 카테고리/검색 필터.
- **커스텀 운동 시각 구별(2026-06-14):** `id.startsWith('custom-')`이면 `bg-blue-950/50 border border-blue-800/50` + 파란 "커스텀" 라벨 + 삭제(×) 버튼. **이 색상 구별은 라이브러리 화면에서만.** 운동 기록 추가(Session) 모달 리스트는 색 구별 없이 그대로.
- 추가: 이름 필수. cardio일 때만 MET 입력(양수면 저장, 아니면 null). id=`custom-uuid`.
- 기본 운동은 삭제 불가(× 없음).

### 6.6 Settings `/settings`
```
┌──────────────────────────────────────┐
│ 설정                                   │
│ ┌─ 기본 설정 ──────────────────────┐  │
│ │ 휴식 타이머 (초)                   │  │  ← 체중 필드 제거됨(2026-06-14)
│ │ [ 90 ]  (0이면 타이머 꺼짐)        │  │
│ └──────────────────────────────────┘  │
│ ┌─ 운동 목록 관리 ─────────────────┐  │
│ │ 운동 목록 보기 / 커스텀 추가    →  │  │  → /library
│ └──────────────────────────────────┘  │
│ ┌─ 데이터 내보내기 ────────────────┐  │
│ │ 전체 기록(N개 세션)을 .md로...     │  │
│ │ [ 운동 기록 내보내기 (.md) ]       │  │
│ └──────────────────────────────────┘  │
│  (상태 메시지: 저장 완료 ✓ 등)          │
│ [          저장          ]             │  ← 휴식 시간 localStorage 저장
└──────────────────────────────────────┘
```
- 영문 UI 섹션: `Preferences`, `Exercise library`, `Backup / Restore`. 계정·로그아웃 UI는 없다.
- Preferences에는 `Rest timer alerts` 권한 상태를 `Enabled/Disabled`로 표시한다. 최초 상태에서는 `Enable alerts`로 iOS 권한을 요청하고, 거부 상태에서는 iPhone Settings의 알림 경로를 안내한다. 앱이 다시 활성화되면 권한 상태를 새로 확인한다.
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
- `[-step] [숫자 input] [+step]`. props: `value, onChange, step, unit, min=0, disabled`.
- `onPointerDown`으로 즉시 반응. 숫자 input은 focus/click 때 현재 값을 전체 선택해 다음 입력이 기존 값을 교체한다. 외부 value 변경 시 비포커스 상태에서만 input 동기화(입력 중 방해 X). blur 시 빈/음수면 min으로 보정. 소수 누적오차 `toFixed(2)`.

### RestTimer
- 세트 완료 시 하단(`bottom-20`) 오버레이. 원형 SVG 진행 + 가로 바. [Skip] 버튼.
- 시작할 때 `endsAt = Date.now() + restSeconds * 1000`을 저장하고, `getRemainingSeconds(endsAt)`로 표시 시간을 계산한다. 250ms 폴링 외에 `visibilitychange`, `focus`, `pageshow`에서도 즉시 다시 계산하므로 브라우저가 백그라운드 타이머를 중단해도 경과 시간이 밀리지 않는다.
- iOS에서는 타이머 시작 순간 `@capacitor/local-notifications`에 종료 시각, 기본 시스템 사운드, foreground 표시를 가진 알림 ID `1101`을 예약한다. 앱이 백그라운드 또는 중단 상태여도 iOS가 종료 순간 전달하며, 기기 무음·알림 설정에 따른 소리/햅틱 처리는 시스템에 맡긴다. 첫 예약 때 또는 Settings의 `Enable alerts`에서 알림 권한을 요청한다.
- [Skip]은 예약을 취소한다. 새 타이머는 같은 ID의 이전 예약을 취소·교체하며 generation 값으로 비동기 권한 요청 경합을 막는다. 네이티브 예약이 성공한 경우 타이머 종료 effect는 Web Audio를 중복 재생하지 않는다.
- 웹/PWA에서는 Web Audio로 0.25초 톤을 1회 재생하고, 오디오 시작이 실패하면 지원 브라우저에서 250ms 진동을 1회 요청한다. 이는 브라우저를 떠나 있는 동안의 즉시 알림을 보장하지 않으며 iOS 앱의 네이티브 알림이 정식 동작이다.

### UndoToast
- 5초 카운트다운 진행 바. [되돌리기] → onUndo+onDismiss. 자동 만료 시 onDismiss. `bottomOffset` 커스터마이즈 가능(기본 `5rem`). `animate-slide-up`.

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
- `ios/App/App.xcodeproj`는 Capacitor v8로 생성했으며 앱 번들에 `dist` 웹 자산을 포함한다. 원격 사이트를 불러오는 단순 WebView가 아니다.
- `@capacitor/filesystem`, `@capacitor/local-notifications`, `@capacitor/share`를 Swift Package Manager 프로젝트에 연결한다. `npm run ios:sync`가 iOS용 상대경로 빌드와 플러그인/자산 동기화를 수행한다.
- `PrivacyInfo.xcprivacy`를 App target의 Copy Bundle Resources에 포함하고 Filesystem의 file timestamp API 사용 이유 `C617.1`을 선언한다. 수집 데이터와 추적은 없음으로 선언한다.
- iOS AppIcon은 불투명 RGB 1024×1024 정사각형 자산이며 시스템 마스크용 모서리 여백이나 투명 영역을 포함하지 않는다. 앱은 iPhone 전용·세로 방향으로 고정한다.
- iOS 빌드는 PWA 서비스워커를 포함하지 않는다. 앱 UI와 데이터 접근은 오프라인으로 동작하며 로그인 화면이나 Firebase SDK가 없다.
- Windows에서는 Xcode 빌드와 서명 검증을 수행할 수 없다. macOS에서 Xcode로 앱 팀·서명·최종 bundle identifier를 확인하고 시뮬레이터와 실제 기기에서 알림 권한, 백그라운드 알림, 파일 가져오기/공유를 검증해야 한다.

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

- **테마:** 다크 고정. 배경 `zinc-950/900/800`, 텍스트 `white/zinc-300/400/500/600`.
- **포인트 컬러:** 파랑 `blue-600`(주요 버튼/활성), `blue-400`(강조 텍스트/링크), `blue-500`(진행 바).
- **상태색:** 성공 `green-600/500`, 위험/삭제 `red-400/500`, 에러 배너 `red-900/30 + red-800`.
- **커스텀 운동(라이브러리 전용):** `bg-blue-950/50 + border-blue-800/50`.
- **모양:** 카드 `rounded-2xl`, 칩/작은요소 `rounded-xl/full`. 모달은 바텀시트(`rounded-t-2xl mt-auto`).
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
- [ ] EAS Custom Build 설정, 시뮬레이터·실기기 검증, App Store 메타데이터와 제출

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
