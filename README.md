# Workout Logger

개인용 운동 기록 PWA. GitHub Pages 배포, GitHub Gist로 기기 간 데이터 동기화.

## 주요 기능

- **운동 기록** — 웨이트(세트/무게/횟수), 유산소(시간/거리/속도/경사/칼로리)
- **이전 세션 불러오기** — 지난번 값이 자동 입력, 변경 시만 수정
- **휴식 타이머** — 세트 완료 시 자동 시작
- **InBody 분석** — 체성분 입력 → SMI 평가 + 트레이닝 목표 + 운동별 추천 무게
- **Gemini Vision** — 유산소 기기 화면 / InBody 결과지 사진 촬영 → 자동 입력
- **칼로리 계산** — MET 공식 자동계산
- **PWA** — 홈화면 설치, 앱처럼 동작
- **GitHub Gist 동기화** — 폰/PC 어디서든 같은 데이터

## 기술 스택

- React 19 + Vite + Tailwind CSS v4
- GitHub Gist API (데이터 저장)
- Gemini Vision API (사진 인식)
- vite-plugin-pwa (PWA)
- GitHub Pages (배포)

## 시작하기

### 1. GitHub Pages 활성화

저장소 → Settings → Pages → Branch: `gh-pages` → Save

배포 URL: `https://choongchoongee-star.github.io/Workout/`

### 2. 앱 초기 설정

앱 접속 → **설정** 탭:

| 항목 | 설명 |
|------|------|
| 체중 | 칼로리 자동계산에 사용 |
| 키 | InBody SMI 계산에 사용 |
| GitHub Personal Access Token | `gist` 권한만 체크해서 발급 |
| Gist ID | "새 Gist 생성" 버튼으로 자동 생성 |
| Gemini API Key | Google AI Studio에서 발급 (사진 기능 선택) |

### 3. PWA 설치

브라우저 주소창 → "홈 화면에 추가" → 앱처럼 사용

## 개발

```bash
npm install
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run deploy     # GitHub Pages 배포
npm run icons      # PWA 아이콘 재생성 (sharp 필요)
```

## 보안

- API 키는 런타임에 설정 화면에서 입력 → `localStorage`에만 저장
- 소스코드/저장소에 키 없음
- GitHub Token은 `gist` 권한만 부여 권장
- Gemini API Key는 Google AI Studio에서 사용량 한도 + HTTP referrer 제한 설정 권장

## 프로젝트 구조

```
src/
├── data/exercises.js         # 기본 운동 목록 (50개)
├── lib/
│   ├── gist.js               # GitHub Gist API
│   ├── gemini.js             # Gemini Vision API
│   ├── storage.js            # localStorage (키/설정)
│   ├── calories.js           # MET 칼로리 계산
│   ├── inbody.js             # InBody 분석 (SMI, 목표, 추천무게)
│   └── epley.js              # Epley 1RM 계산
├── context/AppContext.jsx    # 전역 상태 + Gist 동기화
├── components/
│   ├── Layout.jsx            # 하단 네비게이션
│   ├── StepperInput.jsx      # [-] 값 [+] 입력 컴포넌트
│   └── RestTimer.jsx         # 휴식 타이머
└── screens/
    ├── Home.jsx              # 메인화면
    ├── Session.jsx           # 운동 기록 (핵심)
    ├── History.jsx           # 기록 목록
    ├── SessionDetail.jsx     # 기록 상세
    ├── InBody.jsx            # InBody 입력/기록 목록
    ├── InBodyAnalysis.jsx    # 체성분 분석 결과
    ├── Library.jsx           # 운동 목록 관리
    └── Settings.jsx          # 설정
```

## 스펙

[conductor/tracks/workout/spec.md](../conductor/tracks/workout/spec.md)
