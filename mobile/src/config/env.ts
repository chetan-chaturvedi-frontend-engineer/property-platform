/**
 * Environment-specific configuration, kept separate from UI code.
 * Swap per build variant (e.g. via react-native-config) when a real backend exists.
 *
 * BEFORE STORE SUBMISSION: set real, publicly reachable HTTPS URLs below. Both Google Play and
 * the App Store require a working privacy-policy URL on the store listing.
 */
export const env = {
  apiBaseUrl: 'https://api.example.com/v1',
  requestTimeoutMs: 15000,
  privacyPolicyUrl: 'https://example.com/privacy',
  termsUrl: 'https://example.com/terms',
  supportEmail: 'support@example.com',
} as const;
