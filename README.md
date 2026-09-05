# Workout Logger

개인용 운동 기록 앱. React 화면을 Capacitor iOS 앱에 포함하며 계정이나 데이터 서버 없이 기기 내부에 기록을 저장한다. 브라우저/PWA 빌드는 로컬 개발용으로 유지한다. GitHub Pages에는 앱 소개·지원·개인정보처리방침과 OTA 파일만 게시한다.

## 주요 기능

- 웨이트·맨몸·유산소 운동 기록과 자동 저장
- 이전 세트 값 재사용 및 숫자 탭 후 즉시 덮어쓰기
- 앱이 백그라운드여도 iOS가 전달하는 휴식 종료 로컬 알림
- 운동별 과거 기록과 날짜별 기록 조회
- 커스텀 운동 관리
- Markdown 전체 백업 내보내기·가져오기
- 로그인, Firebase, 별도 백엔드 서버 없음

## 데이터 저장

- iOS: 앱 전용 `Directory.Data/workout-data.json` + 직전 정상 상태 `workout-data.backup.json`
- 브라우저 개발/PWA: `localStorage`의 `wl_workout_data_v1`
- 휴식 시간 같은 가벼운 설정: `localStorage`
- 백업: Settings의 `Export workouts (.md)`로 Files 또는 공유 시트에 저장

저장할 때 임시 파일을 검증하고 직전 정상 파일을 보관하며, 기본 파일이 손상되면 시작 시 자동 복구한다. 서버 동기화가 없으므로 앱 삭제나 기기 분실에 대비해서는 Markdown 백업을 별도로 보관해야 한다. 기존 Firebase 기록은 자동 이전하지 않으며, 이전에 내보낸 `.md` 파일을 Settings에서 가져온다.

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
npm run check:ios-release # 번들 ID, 버전, Scheme, EAS 절차 등 출시 설정 검사
```

Xcode 프로젝트는 `ios/App/App.xcodeproj`에 있고 `App` Scheme은 공유되어 있다. iOS 대상은 iPhone 전용·세로 방향으로 고정되어 있으며 상·하단 safe area를 반영한다. App Store용 빌드와 서명은 `.eas/build/ios-production.yml`의 Capacitor/SPM용 EAS Custom Build를 사용한다. EAS 프로젝트 `@choongchoongee/workout-logger`가 연결되어 있지만, 실기기 검증을 마치기 전에는 원격 빌드를 실행하지 않는다.

Settings에서 알림 권한 상태를 확인하고 최초 권한을 요청할 수 있다. 거부된 경우 `Open iPhone Settings`가 이 앱의 시스템 설정 화면을 연다. 허용되면 `@capacitor/local-notifications`가 종료 시각의 로컬 알림을 예약한다. Filesystem 필수 이유 API는 App target의 `PrivacyInfo.xcprivacy`에 선언되어 있고, 비면제 암호화를 사용하지 않는다는 App Store 선언도 Info.plist와 EAS 앱 설정에 반영되어 있다.

최종 준비 후 최초 원격 빌드는 아래 명령으로 시작한다. 이 명령은 Apple 서명 자격 증명과 App Store Connect 설정을 확인한 뒤에만 실행한다.

```bash
npx eas-cli@latest build --platform ios --profile production
```

개인정보처리방침은 앱의 Settings에서 확인할 수 있으며 공개 URL은 `https://choongchoongee-star.github.io/Workout/privacy/`이다.

## iPhone OTA

Capawesome Live Update 8을 자체 호스팅 방식으로 사용한다. 별도 유료 OTA 계정 없이 GitHub Pages의 `/Workout/ota/<native-runtime>/latest.json`과 서명된 ZIP을 받는다. 운동 데이터는 전송하지 않는다. 정상 화면과 데이터가 준비된 뒤 업데이트를 확인하고, 다운로드한 버전은 앱을 완전히 종료 후 재실행할 때 적용한다. 30초 내 준비되지 않는 업데이트는 내장 버전으로 복구하고 차단한다.

`npm run ota:prepare`는 네이티브 호환성을 검사하고 새 Capacitor 웹 빌드의 ZIP·SHA-256·RSA 서명을 `ota-release/`에 만든다. `npm run ota:publish`는 준비된 파일을 GitHub Pages에 게시하므로 사용자 배포 승인 후에만 실행한다. EAS는 사용하지 않는다. 최초 iPhone 빌드에 플러그인·공개키가 포함되어야 작동한다.

서명 개인키는 Git에서 제외된 `.ota-keys/private.pem`에 있다. 안전한 개인 보관소에 별도로 백업해야 하며 소스나 배포 파일에 포함하면 안 된다. 초기화 스크립트 `node scripts/ota-init.mjs`는 키가 이미 구성되어 있으면 중단한다. 키 교체나 네이티브 변경은 새 iPhone 빌드가 필요하다.

배포 중지·복구는 해당 runtime의 `latest.json`을 `{ "schema": 1, "runtime": "<native-runtime>", "bundle": null }`로 게시한다. 다음 확인 시 내장 버전을 다음 실행 대상으로 지정한다. 운동 저장 형식을 바꾸는 OTA는 이전 버전과 데이터 호환성을 유지해야 한다. 최초 OTA 파일과 공개 정책은 2026-09-05 게시했다. 실제 기기의 서명 검증·실패 복구 테스트는 아직 대기 중이다.

## TestFlight 준비 순서

1. OTA 배포 파일과 변경된 개인정보처리방침을 검토하고 공개 게시를 승인한다.
2. App Store Connect 앱 레코드의 bundle ID `com.choongchoongeestar.workout`, Apple 팀과 서명 접근 권한을 확인한다. 현재 `submit.production.ios`의 App Store Connect 앱 ID는 미설정이다.
3. `node --test src/lib/*.test.mjs`, `npm run lint`, `npm run check:ios-release`, `npm run ios:sync`로 로컬 준비를 확인한다.
4. 사용자에게 필요한 EAS 빌드 작업을 설명하고 명시적인 승인을 받은 후에만 실행한다. TestFlight 제출도 승인 범위를 별도로 확인한다.
5. iPhone에서 오프라인 시작, Markdown 가져오기·내보내기, 앱 재실행 후 저장, 백그라운드 휴식 알림, 알림 설정 바로가기, safe area를 확인한다.
6. 테스트용 OTA의 다운로드·완전 종료 후 적용·변조 ZIP 거절·시작 실패 시 내장 버전 복구·오프라인 사용을 확인한다. 운동 중에는 자동 재시작하지 않는지 확인한다. 테스트 데이터로 검증하고 실제 운동 백업은 별도 보관한다.

## 공개 안내 사이트 배포

```bash
npm run deploy
```

`master` 푸시는 소스만 갱신한다. `npm run build:site`는 `site/`의 소개 페이지와 `public/privacy/index.html`을 `site-dist/`에 구성한다. `npm run deploy`는 사용자 승인 후 안내 사이트를 `gh-pages`에 게시하며 과거 PWA 파일을 제거하고 `ota/`는 보존한다. 웹 운동 기록 앱은 공개 배포하지 않는다. 기존 PWA 서비스워커는 같은 URL의 종료용 worker로 교체해 해제하며 로컬 운동 저장소는 삭제하지 않는다.
