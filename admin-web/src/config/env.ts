import { z } from 'zod';

/**
 * The only module that reads import.meta.env. Every value here ships in the public bundle, so it
 * must never hold secrets. Invalid configuration fails fast at startup.
 *
 * The environment follows Vite's build mode (`vite --mode staging`), so no committed .env files are
 * needed; deployments override individual values with VITE_* variables (see .env.example).
 */
const APP_ENVIRONMENTS = ['development', 'staging', 'production', 'test'] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

const MODE_TO_ENVIRONMENT: Record<string, AppEnvironment> = {
  development: 'development',
  mock: 'development',
  staging: 'staging',
  production: 'production',
  analyze: 'production',
  test: 'test',
};

const envSchema = z.object({
  MODE: z.string().default('development'),
  VITE_APP_ENV: z.enum(APP_ENVIRONMENTS).optional(),
  VITE_APP_NAME: z.string().min(1).default('Property Admin'),
  VITE_API_BASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith('/') || /^https:\/\//.test(value) || /^http:\/\/localhost/.test(value),
      { message: 'must be a relative path, an https URL, or http://localhost' },
    )
    .default('/api/v1'),
  VITE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  VITE_ENABLE_MOCKS: z.enum(['true', 'false']).optional(),
});

export interface Env {
  appEnv: AppEnvironment;
  appName: string;
  apiBaseUrl: string;
  apiTimeoutMs: number;
  enableMocks: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(import.meta.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  const values = parsed.data;
  // An unknown mode is treated as production: the strictest choice.
  const appEnv = values.VITE_APP_ENV ?? MODE_TO_ENVIRONMENT[values.MODE] ?? 'production';
  return {
    appEnv,
    appName: values.VITE_APP_NAME,
    apiBaseUrl: values.VITE_API_BASE_URL.replace(/\/+$/, ''),
    apiTimeoutMs: values.VITE_API_TIMEOUT_MS,
    enableMocks: values.VITE_ENABLE_MOCKS
      ? values.VITE_ENABLE_MOCKS === 'true'
      : values.MODE === 'mock',
    isDevelopment: appEnv === 'development',
    isProduction: appEnv === 'production',
  };
}

export const env: Env = loadEnv();
