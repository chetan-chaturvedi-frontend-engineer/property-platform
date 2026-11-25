import {
  API_BASE_URL,
  PRIVACY_POLICY_URL,
  REQUEST_TIMEOUT_MS,
  MAPS_ANDROID_ENABLED,
  SUPPORT_EMAIL,
  TERMS_URL,
} from '@env';

/**
 * Environment-specific configuration, the single place the app reads `.env` values (see
 * `.env.example`). Values are inlined at build time by react-native-dotenv, so restart Metro with
 * `npm start -- --reset-cache` after editing `.env`. Never put secrets in `.env`.
 *
 * BEFORE STORE SUBMISSION: build releases with real, publicly reachable HTTPS URLs. Both Google
 * Play and the App Store require a working privacy-policy URL on the store listing.
 */
export const env = {
  apiBaseUrl: API_BASE_URL ?? 'https://api.example.com/api/v1',
  requestTimeoutMs: Number(REQUEST_TIMEOUT_MS) || 15000,
  privacyPolicyUrl: PRIVACY_POLICY_URL ?? 'https://example.com/privacy',
  termsUrl: TERMS_URL ?? 'https://example.com/terms',
  supportEmail: SUPPORT_EMAIL ?? 'support@example.com',
  /** Android only: true when the build was given a Google Maps API key (see android/README.md). */
  mapsAndroidEnabled: MAPS_ANDROID_ENABLED === 'true',
} as const;
