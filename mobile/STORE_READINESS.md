# Store readiness — Dwellery

Honest status of what is done in code and what must still happen before submitting to Google Play and the App Store. No store reviews can be guaranteed; this lists the common rejection causes and where this project stands.

## Done in code

| Requirement | Status |
| --- | --- |
| React Native CLI (no Expo), TypeScript strict | Done |
| Minimal Android permissions | Only `INTERNET` declared |
| Release build is **not** debug-signed | Done: `android/app/build.gradle` reads `android/keystore.properties`; without it the release is left unsigned |
| Code shrinking for release | `enableProguardInReleaseBuilds = true` (verify with a real release build) |
| In-app account deletion (Play + App Store 5.1.1(v)) | Screen + `accountService.deleteAccount()`; needs a real `DELETE /account` endpoint |
| Privacy policy / terms reachable in app | `Legal` screen (draft text) |
| Auth tokens in OS keystore | `react-native-keychain` |
| Cleartext traffic | Disabled in release by the RN template (`usesCleartextTraffic`) |
| No third-party social login | So "Sign in with Apple" is not required |

## Must do before submission (not possible from code alone)

1. **Real backend.** All data currently comes from `src/services/mockData.ts`. Apps showing fake listings, fake "Verified" badges or placeholder pricing risk rejection (Apple 2.1 / 4.2, Play "Deceptive behavior"). Replace service bodies with `apiClient` calls and remove `mockData.ts`.
2. **Placeholders to finish:**
   - Map screen is a placeholder (needs `react-native-maps` + API keys).
   - Photo/video upload and ID-document upload are stubs (need image-picker + the permission strings/rationales; add `NSPhotoLibraryUsageDescription`/`NSCameraUsageDescription` on iOS and only the permissions actually used on Android).
   - Seller registration fee / payment: digital goods must use Google Play Billing / Apple In-App Purchase; fees for real-world services may use other processors. Confirm which applies with the store policies before charging.
   - Login/OTP flow does not exist yet; role selection is a demo entry screen.
3. **Real URLs** in `src/config/env.ts` (privacy policy, terms, support email) and counsel-reviewed policy text.
4. **Application ID.** Currently `com.propertyproapp`. Pick your permanent reverse-domain ID **before** first upload (it cannot change later). Change `namespace`/`applicationId` in `android/app/build.gradle`, move the Kotlin package under `android/app/src/main/java`, and update the iOS bundle identifier in Xcode.
5. **Upload key.** Generate a keystore (see below), store it and its passwords safely (back up!), enrol in Play App Signing.
6. **App icons / splash / screenshots / feature graphic.** Still the default React Native assets. Store listings need your own.
7. **Store listing forms.** Play: Data safety form, content rating, target audience, ads declaration. Apple: App Privacy "nutrition labels", age rating, review notes with a demo account.
8. **Developer accounts.** Google Play Console (one-time fee), Apple Developer Program (annual fee). Personal Play accounts created recently must run a closed test (12+ testers, 14 days) before production access.
9. **iOS build.** Requires macOS + Xcode (cannot be built on Windows). Run `bundle install && bundle exec pod install` in `ios/`, set signing team, archive in Xcode. Keep `ios/DwelleryApp/PrivacyInfo.xcprivacy` accurate for any SDK you add.
10. **Accessibility / QA.** Interactive controls carry `accessibilityRole`/labels; do a TalkBack/VoiceOver pass, test on small and large screens and Android 8–16.
11. **Target API level.** `targetSdkVersion` is set by the RN template (36). Check Play's current minimum before each release.

## Generate an upload keystore (Android)

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Create `android/keystore.properties` (git-ignored):

```
storeFile=upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

Build the Play bundle: `cd android && ./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`.
