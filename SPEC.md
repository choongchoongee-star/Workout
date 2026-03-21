# Workout Logger — 기획서

> 마지막 업데이트: 2026-03-21
> 현재 Phase: Phase 3 완료

---

## 1. Overview

- **목적:** 웨이트 + 유산소 운동 세션을 최소 마찰로 기록하는 개인용 PWA
- **핵심 제약사항:** 정적 호스팅 (GitHub Pages), 백엔드 없음, Google 계정 로그인 필수
- **기술 스택:** React 19 + Vite + Tailwind CSS v4 + Firebase (Auth + Firestore) + Gemini Vision API
- **주요 사용자:** Charlie (개인 사용)

---

## 2. 아키텍처

### 폴더 구조
```
Workout/
├── src/
│   ├── screens/           # 화면 컴포넌트 (Login, Home, ActiveSession, History, Library, InBody, InBodyAnalysis, Settings)
│   ├── context/
│   │   ├── AuthContext.jsx   # Firebase Google Auth 상태 관리
│   │   └── AppContext.jsx    # 운동 데이터 상태 + Firestore 자동 동기화
│   ├── lib/
│   │   ├── firebase.js    # Firebase 초기화 (auth, db)
│   │   ├── firestore.js   # Firestore load/save (users/{uid}/data/workout)
│   │   ├── gemini.js      # Gemini Vision API (cardio + InBody 사진 추출)
│   │   ├── inbody.js      # 체성분 분석 (SMI, 체지방률, 목표 제안, 추천 무게)
│   │   ├── epley.js       # 점진적 과부하 제안 (getProgressionSuggestion)
│   │   └── calories.js    # MET 기반 칼로리 계산
│   └── ...
├── .env                   # Firebase config (git 제외)
├── public/                # PWA 아이콘, manifest
└── vite.config.js
```

### 핵심 데이터 흐름
```
Google 로그인 → Firebase Auth → uid 획득
운동 기록 → Firestore (users/{uid}/data/workout)
  └── exercises[], sessions[], inbody[]

API 키 / 설정 → localStorage (Gemini Key, 체중, 키, 휴식 시간)

InBody 사진 → Gemini Vision → 수치 추출 → 분석 결과
유산소 기기 사진 → Gemini Vision → 기록 자동 입력
```

### 외부 의존성
- Firebase Auth (Google 로그인)
- Firebase Firestore (데이터 저장)
- Gemini API Key (localStorage, Google AI Studio)

---

## 3. 데이터 모델

### Firestore 구조 (`users/{uid}/data/workout`)

```json
{
  "exercises": [{ "id": "bench-press", "name": "벤치프레스", "category": "가슴", "type": "weight", "met": null }],
  "sessions": [{ "id": "2026-03-14", "date": "2026-03-14", "exercises": [...], "duration_min": 65, "note": "" }],
  "inbody": [{ "id": "ib_1234567890", "date": "2026-03-14", "weight": 78.5, "skeletal_muscle_mass": 35.2, "body_fat_pct": 18.5, ... }]
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
- 칼로리 우선순위: Gemini Vision 추출 → MET 자동 계산 → 수동 입력

### InBody Record
```json
{
  "id": "ib_1234567890", "date": "2026-03-14",
  "weight": 78.5, "skeletal_muscle_mass": 35.2, "body_fat_pct": 18.5, "body_fat_mass": 14.5,
  "height": 175,
  "left_arm": 3.8, "right_arm": 3.9, "trunk": 27.1, "left_leg": 10.1, "right_leg": 10.3
}
```
- `id`: `ib_${timestamp}` — 하루 여러 개 가능
- segmental 필드 선택사항

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
- [+ 운동 추가] → 검색 모달 (카테고리 + 텍스트 검색)
- 운동 카드: 세트 행 `[-] weight [+] × [-] reps [+] [✓ 완료]`
- bodyweight: "체중" 레이블 + 추가 하중 입력
- cardio: 시간/거리/속도/경사 + [📷 사진으로 입력]
- 이전 세션 참고값 ghost 표시
- 휴식 타이머 자동 시작 (세트 완료 시)
- 점진적 과부하 배너 (3회 연속 동일 무게 → +2.5kg 제안)
- **구현 상태:** ✅ 완료

### 4.3 히스토리
- 날짜 역순 목록
- 탭 → 상세 보기 (읽기 전용) + [수정] [삭제]
- **구현 상태:** ✅ 완료

### 4.4 운동 라이브러리
- 카테고리 탭 + 검색바
- 기본 ~50개 운동 (가슴/등/어깨/팔/하체/복근/유산소)
- 커스텀 운동 추가 (이름, 카테고리, 타입, MET)
- 삭제
- **구현 상태:** ✅ 완료

### 4.5 InBody 입력
- [📷 결과지 촬영] → Gemini Vision 자동 추출 (`extractInBodyFromPhoto`)
- 수동 직접 입력도 가능
- 저장 → 체성분 분석 화면 자동 이동
- 과거 기록 목록 + [분석 보기]
- **구현 상태:** ✅ 완료

### 4.6 체성분 분석 (InBodyAnalysis)
- SMI = 골격근량(kg) / 키(m)²
  - 남: 낮음 <7.0 / 보통 7.0~8.5 / 높음 >8.5
  - 여: 낮음 <5.7 / 보통 5.7~6.8 / 높음 >6.8
- 트레이닝 목표 자동 제안

| 조건 | 목표 | 횟수 | 세트 | 휴식 |
|------|------|------|------|------|
| 체지방률 높음 (남>25%, 여>33%) | 지방 감량 | 12-15회 | 3세트 | 60초 |
| SMI 낮음 + 체지방률 정상 | 근육 증가 | 8-12회 | 4세트 | 90초 |
| SMI 보통↑ + 체지방률 정상 | 근력 향상 | 4-6회 | 5세트 | 180초 |
| 전반적 균형 | 근비대 유지 | 8-12회 | 3-4세트 | 90초 |

- 부위별 불균형 감지 (좌우 차이 >10% → 경고)
- 운동별 추천 무게 테이블 (InBody 체성분 기반)
- **구현 상태:** ✅ 완료

### 4.7 점진적 과부하
- 3회 연속 동일 무게 완료 → +2.5kg 제안 배너
- **구현 상태:** ✅ 완료

### 4.8 설정
- 계정 정보 (Google 프로필 사진, 이름, 이메일) + 로그아웃
- 체중 (kg), 키 (cm), 기본 휴식 타이머 (초)
- Gemini API Key + [연결 테스트]
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
- [x] Gemini Vision (유산소 기기 사진)
- [x] PWA

### ✅ Phase 2 — InBody
- [x] InBody 입력 + Gemini Vision 파싱
- [x] 체성분 분석 및 목표 제안
- [x] 부위별 불균형 감지

### ✅ Phase 3 — 점진적 과부하
- [x] 점진적 과부하 알림 (+2.5kg 제안)

---

## 7. Out of Scope

- 다중 사용자 / 소셜 기능
- 분석 차트 / 통계
- 바코드 / 외부 DB 운동 검색
- 알림 / 리마인더
- Epley 1RM 표시 (제거됨)

---

## 8. 미완료 / 알려진 이슈

- Firebase 프로젝트 설정 필요 (.env에 config 입력)
- 성별 설정 없음 — InBody 분석 남성 기준 고정
