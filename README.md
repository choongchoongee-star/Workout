# Workout Logger

개인용 운동 기록 PWA. GitHub Pages 배포, Firebase로 인증 및 데이터 동기화.

## 주요 기능

- **운동 기록** — 웨이트(세트/무게/횟수), 맨몸(체중+추가하중/횟수), 유산소(시간/거리/속도/경사/칼로리)
- **이전 세션 불러오기** — 운동 추가 시 마지막 세션의 마지막 세트 값으로 1세트 자동 생성
- **휴식 타이머** — 세트 완료 체크 시 자동 시작, 원형 프로그레스 + 바이브레이션
- **점진적 과부하** — 3회 연속 동일 무게 완료 시 +2.5kg 제안 배너
- **되돌리기** — 운동/세트/세션 삭제 후 5초 내 undo 가능
- **칼로리 자동계산** — MET 공식 (유산소 운동, 시간 + 체중 입력 시)
- **날짜 변경** — 헤더 날짜 탭으로 과거 날짜 세션 조회/수정
- **PWA** — 홈화면 설치, 앱처럼 동작
- **Firebase 동기화** — Google 로그인 후 기기 간 동일 데이터

## 기술 스택

- React 19 + Vite 8 + Tailwind CSS v4
- Firebase Auth (Google 로그인) + Firestore (데이터 저장)
- vite-plugin-pwa (PWA)
- GitHub Pages (배포)

## 시작하기

### 1. Firebase 설정

`.env` 파일에 Firebase 프로젝트 설정값 입력:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 2. GitHub Pages 배포

저장소 → Settings → Pages → Branch: `gh-pages` → Save

배포 URL: `https://<username>.github.io/Workout/`

### 3. 앱 초기 설정

앱 접속 → Google 로그인 → **설정** 탭:

| 항목 | 설명 |
|------|------|
| 체중 (kg) | 유산소 칼로리 자동계산에 사용 |
| 휴식 타이머 (초) | 세트 완료 시 자동 시작 타이머 기본값 |

### 4. PWA 설치

브라우저 주소창 → "홈 화면에 추가" → 앱처럼 사용

## 개발

```bash
npm install
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run deploy     # GitHub Pages 배포 (gh-pages)
npm run lint       # ESLint
npm run icons      # PWA 아이콘 재생성 (sharp 필요)
```

## 프로젝트 구조

```
src/
├── data/exercises.js         # 기본 운동 목록 (48개, 7카테고리)
├── lib/
│   ├── firebase.js           # Firebase 초기화 (auth, db)
│   ├── firestore.js          # Firestore load/save (users/{uid}/data/workout)
│   ├── storage.js            # localStorage (체중, 휴식 시간)
│   ├── calories.js           # MET 칼로리 계산
│   ├── epley.js              # 점진적 과부하 제안 (3회 연속 동일 무게 감지)
│   └── dateUtils.js          # 날짜 포맷 유틸
├── context/
│   ├── AuthContext.jsx        # Firebase Google Auth 상태 관리
│   └── AppContext.jsx         # 운동 데이터 상태 + Firestore 자동 동기화
├── components/
│   ├── Layout.jsx             # 하단 네비게이션 (홈/운동/기록/설정)
│   ├── StepperInput.jsx       # [-] 값 [+] 스테퍼 입력
│   ├── RestTimer.jsx          # 휴식 타이머 (원형 프로그레스)
│   └── UndoToast.jsx          # 삭제 되돌리기 토스트 (5초)
└── screens/
    ├── Login.jsx              # Google 로그인
    ├── Home.jsx               # 메인화면 (오늘 운동 시작/이어하기 + 최근 5개 기록)
    ├── Session.jsx            # 운동 기록 (핵심 화면)
    ├── History.jsx            # 기록 목록 (날짜 역순 + 날짜 점프)
    ├── SessionDetail.jsx      # 기록 상세 (수정/삭제)
    ├── Library.jsx            # 운동 목록 관리 (검색/카테고리/커스텀 추가)
    └── Settings.jsx           # 설정 (계정, 체중, 휴식 타이머)
```

## 보안

- Firebase 설정은 `.env` 파일에 저장 (`.gitignore` 처리)
- 체중/휴식 시간은 `localStorage`에만 저장
- Firestore 보안 규칙으로 `users/{uid}` 하위만 본인 접근 가능
