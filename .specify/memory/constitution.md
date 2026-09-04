# Workout Logger Constitution

## Core Principles

### I. Minimal Friction
운동 중 최소 터치로 기록 완료. 복잡한 설정, 불필요한 팝업, 추가 단계를 배제한다.

### II. Personal-Only Scope
Charlie 1인 사용. 다중 사용자, 소셜 기능, 분석 차트 등은 영구적으로 Out of Scope.

### III. Static Hosting + Firebase
GitHub Pages 정적 배포. 서버 없음. 인증과 데이터는 Firebase (Auth + Firestore)에만 의존.

### IV. Feature Freeze Discipline
구현된 기능만 유지. 새 기능은 명확한 필요가 확인될 때만 추가. InBody, Gemini Vision 등 제거된 기능은 재도입하지 않는다.

### V. Code Simplicity
React + Vite + Tailwind 단일 스택. 상태 관리는 Context + useReducer. 외부 상태 라이브러리 없음.

## Technology Constraints

- React 19, Vite 8, Tailwind CSS v4
- Firebase Auth (Google 로그인만) + Firestore
- PWA (vite-plugin-pwa)
- GitHub Pages 배포 (gh-pages)
- localStorage: 설정값 전용 (체중, 휴식 타이머)

## Quality Standards

- ESLint 경고 0개 유지
- 접근성: aria 속성, 키보드 포커스 트랩 (모달)
- Firestore 쓰기 안전: undefined 제거, 로드 직후 불필요 저장 방지
- 삭제 작업은 항상 undo 토스트로 복구 가능

## Governance

Constitution은 프로젝트 변경 시 기준으로 사용. 새 기능 추가 시 위 원칙과의 정합성을 확인.

**Version**: 1.0.0 | **Ratified**: 2026-04-10
