# Workout Logger

개인용 운동 기록 앱. React 화면을 Capacitor iOS 앱에 포함하며 계정이나 데이터 서버 없이 기기 내부에 기록을 저장한다. 브라우저/PWA 빌드는 개발과 GitHub Pages 미리보기를 위해 유지한다.

## 주요 기능

- 웨이트·맨몸·유산소 운동 기록과 자동 저장
- 이전 세트 값 재사용 및 숫자 탭 후 즉시 덮어쓰기
- 앱이 백그라운드여도 iOS가 전달하는 휴식 종료 로컬 알림
- 운동별 과거 기록과 날짜별 기록 조회
- 커스텀 운동 관리
- Markdown 전체 백업 내보내기·가져오기
- 로그인, Firebase, 별도 백엔드 서버 없음

## 데이터 저장

- iOS: 앱 전용 `Directory.Data/workout-data.json`
- 브라우저 개발/PWA: `localStorage`의 `wl_workout_data_v1`
- 휴식 시간 같은 가벼운 설정: `localStorage`
- 백업: Settings의 `Export workouts (.md)`로 Files 또는 공유 시트에 저장

서버 동기화가 없으므로 앱 삭제나 기기 분실에 대비해 Markdown 백업을 별도로 보관해야 한다. 기존 Firebase 기록은 자동 이전하지 않으며, 이전에 내보낸 `.md` 파일을 Settings에서 가져온다.

## 개발

```bash
npm install --legacy-peer-deps
npm run dev
node --test src/lib/*.test.mjs
npm run lint
npm run build
```

기존 Vite 8과 `@tailwindcss/vite`의 peer 범위 차이 때문에 의존성 설치에는 `--legacy-peer-deps`를 사용한다.

## iOS

Capacitor 앱 ID는 현재 `com.choongchoongeestar.workout`이다.

```bash
npm run ios:sync   # iOS용 빌드 후 Xcode 프로젝트와 플러그인 동기화
npm run ios:open   # macOS에서 Xcode 열기
```

Xcode 프로젝트는 `ios/App/App.xcodeproj`에 있다. 실제 빌드·서명·시뮬레이터/기기 검증·App Store 제출에는 macOS와 Xcode가 필요하다. 첫 휴식 타이머 시작 시 알림 권한을 요청하며, 허용되면 `@capacitor/local-notifications`가 종료 시각의 로컬 알림을 예약한다. Filesystem 필수 이유 API는 App target의 `PrivacyInfo.xcprivacy`에 선언되어 있다.

## 웹 미리보기 배포

```bash
npm run deploy
```

`master` 푸시는 소스만 갱신한다. GitHub Pages 배포는 위 명령으로 `gh-pages` 브랜치에 별도로 수행한다.
