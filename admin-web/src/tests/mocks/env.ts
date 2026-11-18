import type { Env } from '@/config/env';

/** Replaces config/env under Jest (see jest.config.ts), where import.meta.env does not exist. */
export const env: Env = {
  appEnv: 'test',
  appName: 'Property Admin (Test)',
  apiBaseUrl: '/api/v1',
  apiTimeoutMs: 5000,
  enableMocks: false,
  isDevelopment: false,
  isProduction: false,
};
