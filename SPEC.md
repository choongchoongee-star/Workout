# Workout Logger — 기획서 (재구성용 마스터 스펙)

> 마지막 업데이트: 2026-08-21
> 현재 Phase: Phase 3 (무게 탭) 완료 — 유지보수 단계
> 본 문서는 **이 문서만으로 동일한 앱을 처음부터 재구성**할 수 있도록 작성한다. 화면별 와이어프레임·데이터 모델·핵심 로직·디자인 토큰을 모두 포함한다.

---

## 1. Overview

- **목적:** 웨이트 + 유산소 운동 세션을 최소 마찰로 기록하는 개인용 PWA
- **핵심 철학:** "운동 중에 빠르게 기록" — 탭 수 최소화, 자동 입력(이전 값 재사용), 자동 저장
- **핵심 제약사항:** 정적 호스팅(GitHub Pages), 백엔드 서버 없음(Firebase BaaS만 사용), Google 계정 로그인 필수, 1일 1세션
- **주요 사용자:** Charlie (단일 사용자, 개인용)
- **플랫폼:** 모바일 우선 PWA (세로형, 폭 `max-w-lg` 중앙 정렬), 다크 테마 고정

---

## 2. 기술 스택 & 빌드/배포

### 스택
- **React 19** + **Vite 8** (`@vitejs/plugin-react`)
- **Tailwind CSS v4** (`@tailwindcss/vite` 플러그인 방식 — `tailwind.config` 없이 CSS-first)
- **react-router-dom v7** (`BrowserRouter`, `basename="/Workout"`)
- **Firebase v12** — Auth(Google) + Firestore
- **vite-plugin-pwa v1** (`registerType: 'autoUpdate'`, Workbox `generateSW`)
- 아이콘 생성: `sharp` (`generate-icons.mjs`)

### vite.config.js 핵심
```js
base: '/Workout/',           // GitHub Pages 레포 경로
VitePWA({
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
| `lint` | `eslint .` |
| `preview` | `vite preview` |
| `icons` | `node generate-icons.mjs` (PWA 아이콘 생성) |
| `deploy` | `npm run build && gh-pages -d dist` |

### 배포 (중요)
- **자동 CI 없음.** `master` 푸시는 소스만 올라감.
- 라이브 반영은 **수동으로 `npm run deploy`** 실행 → `dist/`를 `gh-pages` 브랜치로 push → GitHub Pages 서빙.
- 라이브 URL: `https://choongchoongee-star.github.io/Workout/`
- PWA 서비스워커(`autoUpdate`)가 새 빌드를 백그라운드 갱신하므로, 배포 후 기기에서는 앱 재실행 1~2회 또는 잠깐의 지연 후 반영됨.

### 환경변수 (`.env`, git 제외)
Firebase 설정값. `src/lib/firebase.js`가 `import.meta.env.VITE_*`로 읽어 `initializeApp` → `auth`, `db`, `googleProvider(GoogleAuthProvider)` export.
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

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
│   │   ├── Login.jsx
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
│   │   ├── AuthContext.jsx   # Firebase Google Auth 상태
│   │   └── AppContext.jsx    # 운동 데이터 상태 + Firestore 자동 동기화
│   ├── lib/
│   │   ├── firebase.js       # Firebase 초기화 (auth, db, googleProvider)
│   │   ├── firestore.js      # load/save (users/{uid}/data/workout), undefined 새니타이즈
│   │   ├── calories.js       # MET 기반 칼로리 계산 (calcCalories)
│   │   ├── sessionUtils.js   # getMainCategory (그날 메인 카테고리)
│   │   ├── dateUtils.js      # localTodayStr, formatDate
│   │   ├── exportUtils.js    # buildMarkdown, downloadTextFile, exportFilename
│   │   └── storage.js        # localStorage 설정값 (휴식 시간, 체중 기본값)
│   ├── data/
│   │   └── exercises.js      # DEFAULT_EXERCISES(48개), CATEGORIES(7개)
│   └── ...
├── .env                      # Firebase config (git 제외)
├── public/                   # PWA 아이콘(icon-192/512.png), manifest 산출물
├── generate-icons.mjs
└── vite.config.js
```

### 핵심 데이터 흐름
```
Google 로그인 → Firebase Auth → uid 획득
  └ AuthContext: user = undefined(로딩) | null(미로그인) | User(로그인)

로그인 시 AppProvider가 Firestore에서 1회 로드
  users/{uid}/data/workout → { exercises[], sessions[] }
  (문서 없으면 exercises=null→기본48개, sessions=[])
  ├ 로드 중: 자식 화면 마운트 보류 + 전체 화면 로딩 표시
  ├ 성공: 데이터를 반영하고 loaded=true, syncing=false
  └ 실패: 빈 데이터로 대체하지 않고 오류 + [다시 시도] 표시

운동 데이터 변경 → reducer state 갱신 → 500ms 디바운스 후 Firestore에 setDoc
  (로드 직후 첫 실행은 justLoadedRef로 스킵 — 빈 데이터 덮어쓰기 방지)

설정값(휴식 시간) → localStorage (수동 저장)
세션 시작 시각 → sessionStorage (소요시간 계산용)
```

### 외부 의존성
- Firebase Auth (Google 팝업 로그인)
- Firebase Firestore (단일 문서에 전체 데이터 저장)

---

## 4. 데이터 모델

### 4.1 Firestore — `users/{uid}/data/workout` (단일 문서)
```json
{
  "exercises": [ Exercise, ... ],   // 기본48 + 커스텀
  "sessions":  [ Session, ... ]     // 날짜 역순 정렬 유지
}
```
- 저장 전 `undefined` 값을 재귀 제거(`sanitizeForFirestore`) — Firestore가 undefined 거부.

### 4.2 Exercise
```json
{ "id": "bench-press", "name": "벤치프레스", "category": "가슴",
  "type": "weight | bodyweight | cardio", "met": 8.3 }
```
- `id`: 기본 운동은 고정 슬러그, 커스텀은 `custom-${crypto.randomUUID()}`
- `category`: CATEGORIES 중 하나 (가슴/등/어깨/팔/하체/복근/유산소)
- `met`: cardio 타입에만 존재 (칼로리 계산용). 그 외 타입은 필드 없음/null
- 커스텀 판별: `id.startsWith('custom-')` → 라이브러리에서만 색상 구별 + 삭제 가능

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

`App.jsx` 구조: `<AuthProvider><BrowserRouter basename="/Workout"><AppRoutes/>`
- `user === undefined` → 전체 화면 스피너
- `user === null` → `<Login/>`
- 로그인됨 → `<AppProvider><Layout><Routes>...`
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
| `*` | → `/session` 리다이렉트 | |

**하단 탭(Layout):** `운동(/session)` · `기록(/history)` · `무게(/weight)` · `설정(/settings)` 4개.
- 활성 탭 `text-blue-400`, 비활성 `text-zinc-500`.
- 라이브러리(`/library`)는 탭 없음 — 설정에서 진입.

---

## 6. 화면별 명세 + 와이어프레임

> 공통: 다크 배경 `bg-zinc-950`, 콘텐츠 `max-w-lg mx-auto p-4`, 하단 네비 높이만큼 `pb`.

### 6.0 Login (`/` 미로그인)
```
┌─────────────────────────────┐
│                             │
│          Workout            │  ← 3xl bold white
│          운동 기록           │  ← zinc-500
│                             │
│  ┌───────────────────────┐  │
│  │ [G] Google로 로그인     │  │  ← 흰 버튼, 구글 로고 SVG
│  └───────────────────────┘  │
│       (로그인 중...)         │  ← loading 시
│       에러 메시지(빨강)       │  ← popup-blocked 등
└─────────────────────────────┘
```
- `signInWithPopup`. `popup-closed-by-user`는 무시(에러 미표시), `popup-blocked`는 안내, 기타는 일반 실패 메시지.

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
- **세트 완료(✓):** 토글. 미완료→완료로 바뀔 때만 휴식 타이머 시작(해제 시엔 안 켜짐). 완료 시 행 잠금(opacity↓, 입력 disabled).
- **bodyweight:** "체중+" 레이블 + added_weight 스테퍼(step 2.5) + reps.
- **cardio:** 카드에 폼(시간/거리/속도/경사 number input 2열 + 칼로리). duration·met 있으면 칼로리 자동계산(수정 가능), met 없으면 수동 입력 안내.
- **삭제:** 세트/운동 ×버튼 → 즉시 제거 + UndoToast(5초). 되돌리기 시 원위치 복원.
- **자동 저장 + 소요시간:** sessionExercises 변경 시 `upsertSession` → AppContext 500ms 디바운스 → Firestore. 빈 세션(길이 0)은 저장 안 함. **오늘 세션이면 자동저장 시 sessionStorage 시작시각 기준 `duration_min`도 함께 계산해 저장**(완료 버튼 제거에 따라 이전 [완료] 로직을 자동저장으로 이관, 2026-06-14). 다른 날 편집은 duration=null.
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
│ ┌─ 계정 ───────────────────────────┐  │
│ │ (프로필사진) 이름 / 이메일          │  │
│ │ [ 로그아웃 ]                       │  │
│ └──────────────────────────────────┘  │
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
- 내보내기: `buildMarkdown(sessions, exercises)` → `workout-YYYY-MM-DD.md` 다운로드(Blob).

---

## 7. 공통 컴포넌트

### Layout
- `<main>` 스크롤 컨테이너 + 하단 고정 `<nav>`(운동/기록/무게/설정).
- 경로 전환 시 스크롤 맨 위로. 단 `/session`은 스크롤 위치 보존(`scrollPositions` ref) — 운동 중 모달 닫기 등에서 위치 유지.

### StepperInput
- `[-step] [숫자 input] [+step]`. props: `value, onChange, step, unit, min=0, disabled`.
- `onPointerDown`으로 즉시 반응. 외부 value 변경 시 비포커스 상태에서만 input 동기화(입력 중 방해 X). blur 시 빈/음수면 min으로 보정. 소수 누적오차 `toFixed(2)`.

### RestTimer
- 세트 완료 시 하단(`bottom-20`) 오버레이. 원형 SVG 진행 + 가로 바. 1초 카운트다운(Session에서 setTimeout).
- 0 도달 시 `navigator.vibrate([200,100,200])` 후 onDone. [건너뛰기] 버튼.

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
- 인증 복원 후 `LOAD_START`로 원격 데이터를 읽으며, 완료 전에는 Session/History 등 자식 화면을 마운트하지 않는다. 따라서 오늘 화면이 초기 빈 `sessions`를 캡처하거나 사용자가 로딩 중 빈 상태를 편집하는 일을 막는다.
- 로드 성공 시 데이터와 함께 `loaded=true`, `syncing=false`로 전환한다. 개발 모드 이중 실행이나 사용자 전환 뒤 늦게 도착한 응답은 effect cleanup의 `cancelled` 플래그로 무시한다.
- 로드 실패 시 빈 배열로 대체하지 않고 `LOAD_ERROR`로 진입한다. 기존 원격 기록을 빈 데이터로 오인·덮어쓰지 않도록 편집 화면 대신 오류와 [다시 시도]를 표시한다.
- 정상 로드 직후 첫 저장 effect는 `justLoadedRef`로 1회 스킵한다. 이후 state 변경은 500ms 디바운스 후 `saveWorkoutData`로 전체 문서를 저장한다.
- 저장 실패는 `syncError`로 보존하며 Session·History·Library 화면에 빨간 동기화 오류 배너를 표시한다(화면별 안내 문구는 다름). 다음 동기화 시작 시 오류를 초기화한다.

### 8.6 소요시간
- 오늘 세션 첫 진입 시 sessionStorage에 시작 ms 기록. **자동저장(디바운스)마다** `(now-start)/60000` 반올림(최소 1분)을 `duration_min`에 저장 → 마지막 활동 시각이 곧 세션 길이. 다른 날 편집은 duration=null. (완료 버튼 제거 전에는 [완료] 시점에만 계산했음, 2026-06-14 변경)

---

## 9. 기본 운동 목록 (`exercises.js`, 48개 / 7카테고리)

- **가슴(7):** 벤치프레스, 인클라인 벤치프레스, 디클라인 벤치프레스, 덤벨 플라이, 케이블 크로스오버, 딥스(bw), 푸쉬업(bw)
- **등(7):** 풀업(bw), 랫풀다운, 시티드 로우, 원암 덤벨 로우, 데드리프트, 티바 로우, 케이블 로우
- **어깨(6):** 오버헤드프레스, 덤벨 숄더프레스, 사이드 레터럴 레이즈, 프론트 레이즈, 페이스풀, 업라이트 로우
- **팔(7):** 바벨 컬, 덤벨 컬, 해머 컬, 프리처 컬, 트라이셉스 푸시다운, 오버헤드 트라이셉스 익스텐션, 스컬 크러셔
- **하체(8):** 스쿼트, 레그프레스, 런지, 레그 익스텐션, 레그 컬, 힙 어브덕션, 카프 레이즈, 루마니안 데드리프트
- **복근(6):** 크런치(bw), 레그 레이즈(bw), 플랭크(bw), 케이블 크런치, 행잉 레그 레이즈(bw), 복근 롤러(bw)
- **유산소(7, MET):** 러닝머신8.3, 자전거8.0, 로잉머신7.0, 일립티컬5.0, 줄넘기10.0, 걷기3.5, 스텝퍼9.0
- `CATEGORIES = ['가슴','등','어깨','팔','하체','복근','유산소']`

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
- [x] 웨이트 + 유산소 기록 / Firebase Auth / Firestore 자동 동기화 / 유산소 수동 기록 / PWA

### ✅ Phase 2 — 점진적 과부하 (이후 롤백)
- [x] +2.5kg 제안 배너 → **2026-06-28 제거** (이전 값 자동 입력만 유지)

### ✅ Phase 3 — 무게 탭
- [x] 운동별 과거 세트 연속 조회 화면 (2026-06-28)

---

## 12. Out of Scope (의도적 제외)

- 다중 사용자 / 소셜 기능
- 분석 차트 / 통계
- 바코드 / 외부 DB 운동 검색
- 알림 / 리마인더
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
