# Dwellery (React Native CLI)

Property buying & selling app: buyer flow (16 screens) and individual-seller flow, built from the reference PDFs (exported images are in `design/`).

## Stack
React Native 0.88 CLI (bare, no Expo) · TypeScript strict · React Navigation · StyleSheet + central theme · `react-native-keychain` for tokens · Jest + React Native Testing Library · ESLint + Prettier.

## Structure
```
src/
  theme/        colors.ts typography.ts spacing.ts radius.ts shadows.ts   (only place for design tokens)
  components/   one reusable component per file (Button, Card, Chip, ...)
  features/     auth · buyer · seller · chat → screens/ hooks/ components/
  services/     apiClient + per-domain services (mock data today) + secure storage
  hooks/        shared hooks (useAsync)
  utils/        pure functions (emi, format)
  navigation/   root stack + buyer/seller tabs
  config/       env.ts (URLs; separate from UI code)
```
Rules: screens call hooks; hooks call services; services call `apiClient`. No colors/hex outside `src/theme/colors.ts`.

## Run locally (Windows / Android)
Prereqs: Node ≥ 22.11, JDK 17, Android Studio + SDK (`ANDROID_HOME` set), an emulator or USB device.

```bash
npm install
npm start            # Metro
npm run android      # in a second terminal
npm run lint && npx tsc --noEmit && npm test
```
iOS builds need macOS + Xcode: `cd ios && bundle install && bundle exec pod install`, then `npm run ios`.

See `STORE_READINESS.md` for what is required before Play Store / App Store submission.

Backend: the app will use the REST API in [`../backend`](../backend) (`/api/v1/auth/**`, `/api/v1/public/**`, `/api/v1/**`); API docs in [`../backend/docs/api`](../backend/docs/api). Until the endpoints are wired in, the service layer in `src/services` serves mock data.
