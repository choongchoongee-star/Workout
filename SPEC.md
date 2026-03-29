# Workout Logger — 기획서

> 마지막 업데이트: 2026-03-29 (UX 수정)
> 현재 Phase: Phase 2 완료

---

## 1. Overview

- **목적:** 웨이트 + 유산소 운동 세션을 최소 마찰로 기록하는 개인용 PWA
- **핵심 제약사항:** 정적 호스팅 (GitHub Pages), 백엔드 없음, Google 계정 로그인 필수
- **기술 스택:** React 19 + Vite + Tailwind CSS v4 + Firebase (Auth + Firestore)
- **주요 사용자:** Charlie (개인 사용)

---

## 2. 아키텍처

### 폴더 구조
```
Workout/
├── src/
│   ├── screens/           # 화면 컴포넌트 (Login, Home, Session, History, SessionDetail, Library, Settings)
│   ├── context/
│   │   ├── AuthContext.jsx   # Firebase Google Auth 상태 관리
│   │   └── AppContext.jsx    # 운동 데이터 상태 + Firestore 자동 동기화
│   ├── lib/
│   │   ├── firebase.js    # Firebase 초기화 (auth, db)
│   │   ├── firestore.js   # Firestore load/save (users/{uid}/data/workout)
│   │   ├── epley.js       # 점진적 과부하 제안 (getProgressionSuggestion)
│   │   ├── calories.js    # MET 기반 칼로리 계산
│   │   └── storage.js     # localStorage 설정값 (체중, 휴식 시간)
│   └── ...
├── .env                   # Firebase config (git 제외)
├── public/                # PWA 아이콘, manifest
└── vite.config.js
```

### 핵심 데이터 흐름
```
Google 로그인 → Firebase Auth → uid 획득
운동 기록 → Firestore (users/{uid}/data/workout)
  └── exercises[], sessions[]

설정값 → localStorage (체중, 휴식 시간)
```

### 외부 의존성
- Firebase Auth (Google 로그인)
- Firebase Firestore (데이터 저장)

---

## 3. 데이터 모델

### Firestore 구조 (`users/{uid}/data/workout`)

```json
{
  "exercises": [{ "id": "bench-press", "name": "벤치프레스", "category": "가슴", "type": "weight", "met": null }],
  "sessions": [{ "id": "2026-03-14", "date": "2026-03-14", "exercises": [...], "duration_min": 65, "note": "" }]
}
```

### Exercise 타입
```json
{ "id": "bench-press", "name": "벤치프레스", "category": "가슴", "type": "weight | bodyweight | cardio", "met": 8.3 }
```
- `met`: cardio 타입에만 사용 (칼로리 계산)

### Weight Set
```json
{ "weight": 80, "added_weight": 0, "reps": 10 }
```
- bodyweight: `weight = null`, `added_weight` = 추가 하중

### Cardio Record
```json
{ "duration_min": 35, "distance_km": 5.2, "speed_kmh": 8.5, "incline_pct": 2.0, "calories": 338 }
```
- 칼로리: MET 자동 계산 또는 수동 입력

---

## 4. 기능 명세

### 4.0 로그인
- Google 로그인 버튼 (Firebase Auth Google 팝업)
- 미로그인 시 모든 화면 차단 → 로그인 화면으로
- **구현 상태:** ✅ 완료

### 4.1 홈 화면
- 오늘 날짜 + [오늘 운동 시작] 버튼 (기존 세션 있으면 열기)
- 최근 5개 세션 요약 (날짜, 운동 수, 시간)
- **구현 상태:** ✅ 완료

### 4.2 Active Session (핵심 화면)
- [+ 운동 추가] 버튼 상단 → 검색 모달 (카테고리 + 텍스트 검색)
- 운동 추가 시: 이전 세션 마지막 세트 값으로 **1세트만** 생성 (나머지는 직접 추가)
- 새 운동은 목록 맨 위에 추가 (오래된 운동이 아래로)
- 운동 카드: 2줄 세트 행 (1줄: `N세트 [✓] [×]`, 2줄: `[-] weight [+] [-] reps [+]`)
- ✓ 체크 후 값 잠금 — 다시 눌러야 수정 가능
- bodyweight: "체중+" 레이블 + 추가 하중 입력
- cardio: 시간/거리/속도/경사 수동 입력
- 휴식 타이머 자동 시작 (세트 완료 시만, 해제 시 안 켜짐)
- 점진적 과부하 배너 (3회 연속 동일 무게 → +2.5kg 제안)
- 날짜 변경: 헤더 날짜 탭 → 해당 날짜 세션 로드
- **구현 상태:** ✅ 완료

### 4.3 히스토리
- 날짜 역순 목록
- 탭 → 상세 보기 + [수정] 버튼 (해당 날짜 운동탭으로 이동) + [삭제]
- **구현 상태:** ✅ 완료

### 4.4 운동 라이브러리
- 카테고리 탭 + 검색바
- 기본 ~50개 운동 (가슴/등/어깨/팔/하체/복근/유산소)
- 커스텀 운동 추가 (이름, 카테고리, 타입, MET)
- 삭제
- **구현 상태:** ✅ 완료

### 4.5 점진적 과부하
- 3회 연속 동일 무게 완료 → +2.5kg 제안 배너
- **구현 상태:** ✅ 완료

### 4.6 설정
- 계정 정보 (Google 프로필 사진, 이름, 이메일) + 로그아웃
- 체중 (kg), 기본 휴식 타이머 (초)
- **구현 상태:** ✅ 완료

---

## 5. 칼로리 계산

```
kcal = MET × 체중(kg) × (시간(분) / 60)
```
- 시간 입력 + 체중 설정 시 자동 계산

---

## 6. Phase 계획

### ✅ Phase 1 — MVP
- [x] 웨이트 + 유산소 기록
- [x] Firebase Auth (Google 로그인)
- [x] Firestore 자동 동기화
- [x] 유산소 수동 기록 (시간/거리/속도/경사)
- [x] PWA

### ✅ Phase 2 — 점진적 과부하
- [x] 점진적 과부하 알림 (+2.5kg 제안)

---

## 7. Out of Scope

- 다중 사용자 / 소셜 기능
- 분석 차트 / 통계
- 바코드 / 외부 DB 운동 검색
- 알림 / 리마인더
- InBody / 체성분 분석 (제거됨)
- Epley 1RM 표시 (제거됨)
- Gemini Vision API 사진 인식 (제거됨)

---

## 8. 미완료 / 알려진 이슈

- Firebase 프로젝트 설정 필요 (.env에 config 입력)
