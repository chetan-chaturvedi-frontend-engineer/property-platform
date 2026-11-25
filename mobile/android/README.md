# Android notes

## Google Maps API key (Search tab map)

iOS uses Apple Maps and needs no key. Android uses Google Maps, which needs a key; the app builds and runs
without one, and the Search tab then shows "map unavailable" with the property list below.

1. In Google Cloud Console create a project, enable **Maps SDK for Android**, and create an API key.
   Restrict it to **Android apps**: package `com.propertyproapp` plus the SHA-1 of each signing key
   (debug keystore and the release/Play App Signing key). The free monthly usage covers the Maps SDK for Android.
2. Give the key to the build, either way (both are git-ignored / outside the repo, never commit the key):
   - environment variable: `GOOGLE_MAPS_API_KEY=AIza... npm run android`
   - or a line in `android/local.properties`: `GOOGLE_MAPS_API_KEY=AIza...`
3. Set `MAPS_ANDROID_ENABLED=true` in `mobile/.env` so the app shows the map instead of the fallback message,
   then restart Metro with `npm start -- --reset-cache`.

The key is injected into `AndroidManifest.xml` through the `googleMapsApiKey` manifest placeholder in
`app/build.gradle`.
