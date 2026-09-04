# Feature Specification: Workout Logger PWA

**Created**: 2026-04-10
**Status**: Implemented (Phase 2 Complete)

## User Scenarios & Testing

### User Story 1 - 운동 세션 기록 (Priority: P1)

사용자가 오늘의 웨이트/맨몸/유산소 운동을 세트 단위로 기록하고, 실시간으로 Firestore에 자동 저장된다.

**Why this priority**: 앱의 핵심 존재 이유. 이 기능 없이는 아무것도 동작하지 않음.

**Independent Test**: 앱에서 운동을 추가하고 세트를 기록하면 Firestore에 즉시 반영됨을 확인.

**Acceptance Scenarios**:

1. **Given** 로그인 상태, **When** "오늘 운동 시작" 탭 → 운동 추가 → 세트 기록 → 완료, **Then** Firestore에 세션 저장, 소요시간 자동 계산, 히스토리로 이동
2. **Given** 기존 세션 존재, **When** "이어하기" 탭, **Then** 기존 세션 데이터 로드하여 이어서 기록
3. **Given** 운동 추가 시, **When** 이전 세션에 동일 운동 기록 있음, **Then** 마지막 세트의 무게/횟수로 1세트 자동 생성

---

### User Story 2 - Google 로그인 및 데이터 동기화 (Priority: P1)

Google 계정으로 로그인하면 Firestore에서 개인 데이터를 로드하고, 모든 변경이 실시간 동기화된다.

**Why this priority**: 기기 간 동기화와 데이터 영속성의 기반.

**Independent Test**: Google 로그인 후 다른 기기에서 동일 계정으로 접속 시 같은 데이터 확인.

**Acceptance Scenarios**:

1. **Given** 미로그인 상태, **When** 앱 접속, **Then** 로그인 화면만 표시 (다른 화면 차단)
2. **Given** Google 팝업 완료, **When** 인증 성공, **Then** Firestore에서 `users/{uid}/data/workout` 로드
3. **Given** 팝업 차단됨, **When** 로그인 시도, **Then** "팝업 차단" 안내 메시지 표시

---

### User Story 3 - 히스토리 조회 및 관리 (Priority: P2)

과거 세션을 날짜 역순으로 조회하고, 상세 보기/수정/삭제를 수행한다.

**Why this priority**: 기록의 가치는 열람할 수 있을 때 생김.

**Independent Test**: 히스토리 목록에서 세션 탭 → 상세 확인 → 수정 또는 삭제 가능.

**Acceptance Scenarios**:

1. **Given** 기록 목록, **When** 세션 탭, **Then** 상세 화면 (운동별 세트 정보, 소요시간)
2. **Given** 상세 화면, **When** "삭제" 탭, **Then** 세션 삭제 + 되돌리기 토스트 (5초)
3. **Given** 상세 화면, **When** "수정" 탭, **Then** 해당 날짜의 운동 세션 편집 화면으로 이동

---

### User Story 4 - 점진적 과부하 제안 (Priority: P2)

3회 연속 동일 무게로 모든 세트를 완료하면 +2.5kg 도전을 제안하는 배너를 표시한다.

**Why this priority**: 꾸준한 성장을 돕는 핵심 차별화 기능.

**Independent Test**: 동일 무게 3회 완료 후 네 번째 세션에서 배너 표시 확인.

**Acceptance Scenarios**:

1. **Given** 벤치프레스 80kg × 3회 세션 완료, **When** 네 번째 세션에서 벤치프레스 추가, **Then** "82.5kg 도전해보세요" 배너 표시
2. **Given** 2회만 완료, **When** 세 번째 세션, **Then** 배너 미표시

---

### User Story 5 - 운동 라이브러리 관리 (Priority: P3)

기본 48개 운동 외에 커스텀 운동을 추가/삭제하고, 카테고리/검색으로 필터링한다.

**Why this priority**: 기본 목록에 없는 운동을 추가하는 확장성.

**Independent Test**: 커스텀 운동 추가 후 세션에서 사용 가능, 삭제 후 목록에서 제거.

**Acceptance Scenarios**:

1. **Given** 라이브러리 화면, **When** "+ 추가" → 이름/카테고리/타입 입력, **Then** 커스텀 운동 생성 (crypto.randomUUID ID)
2. **Given** 커스텀 운동 존재, **When** × 삭제 탭, **Then** 목록에서 제거
3. **Given** 기본 운동, **When** 삭제 시도, **Then** 삭제 버튼 미표시

---

### User Story 6 - 설정 관리 (Priority: P3)

체중, 휴식 타이머 기본값을 설정하고 로그아웃한다.

**Why this priority**: 칼로리 계산과 휴식 타이머의 개인화.

**Acceptance Scenarios**:

1. **Given** 설정 화면, **When** 체중 입력 → 저장, **Then** localStorage에 저장, 유산소 칼로리 자동계산에 반영
2. **Given** 설정 화면, **When** "로그아웃", **Then** Firebase signOut → 로그인 화면으로 이동

---

### Edge Cases

- 네트워크 끊김 시 Firestore 저장 실패 → syncError 배너 표시
- 팝업 차단 시 → 구체적 에러 메시지 안내
- Firestore 로드 실패 시 → 빈 데이터로 덮어쓰기 방지 (justLoadedRef 플래그)
- localStorage 접근 불가 (Safari 사생활 보호 등) → graceful fallback
- 운동 세션 중 날짜 변경 → 해당 날짜 세션 로드, auto-save 1틱 지연

## Requirements

### Functional Requirements

- **FR-001**: Google Auth 로그인 필수, 미로그인 시 전 화면 차단
- **FR-002**: 운동 타입 3종 지원 (weight, bodyweight, cardio)
- **FR-003**: 세트 완료 시 휴식 타이머 자동 시작
- **FR-004**: 모든 데이터 변경 시 Firestore 즉시 동기화
- **FR-005**: 삭제 작업은 5초 이내 undo 가능
- **FR-006**: 유산소 칼로리 = MET × 체중(kg) × (시간/60)
- **FR-007**: 점진적 과부하: 3회 연속 동일 무게 → +2.5kg 제안
- **FR-008**: PWA 설치 가능 (standalone 모드)
- **FR-009**: 1일 1세션 (session.id === date)

### Key Entities

- **Exercise**: id, name, category (7종), type (weight/bodyweight/cardio), met (cardio only)
- **Session**: id (=date), date, exercises[], duration_min
- **Weight Set**: weight, reps, done
- **Bodyweight Set**: added_weight, reps, done
- **Cardio Record**: duration_min, distance_km, speed_kmh, incline_pct, calories

## Success Criteria

### Measurable Outcomes

- **SC-001**: 운동 기록 시작~완료까지 30초 이내 (기존 운동 이어하기 기준)
- **SC-002**: 모든 화면 로드 시 스켈레톤/스피너 표시 (빈 화면 깜빡임 없음)
- **SC-003**: ESLint 경고 0개 유지
- **SC-004**: 모달 키보드 접근성 (Escape 닫기, Tab 포커스 트랩)

## Assumptions

- 사용자는 Google 계정 보유
- 항상 온라인 상태 (오프라인 퍼스트 아님)
- 1인 사용 (보안 규칙: 본인 uid 하위만 접근)
- GitHub Pages 무료 호스팅 사용
