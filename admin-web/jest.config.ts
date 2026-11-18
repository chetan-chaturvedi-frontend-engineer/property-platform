import type { Config } from 'jest';

const config: Config = {
  // jsdom with Node's fetch, streams and TextEncoder restored, which MSW needs.
  testEnvironment: 'jest-fixed-jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.ts'],
  transform: {
    '^.+\\.(m?[jt]sx?)$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
          target: 'es2022',
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  // MSW and some of its dependencies ship ESM only (.mjs, or .js with "type": "module"); SWC turns
  // them into CommonJS. Everything else in node_modules is loaded as is.
  transformIgnorePatterns: [
    '/node_modules/(?!(until-async|@mswjs|msw|rettime|@open-draft)/)(?!.*\\.mjs$)',
  ],
  moduleNameMapper: {
    // import.meta.env does not exist under Jest; tests use a fixed configuration instead.
    '^@/config/env$': '<rootDir>/src/tests/mocks/env.ts',
    // Asset stubs come before the alias, which would otherwise resolve them to the real files.
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(svg|png|jpe?g|gif|webp|avif|woff2?)$': '<rootDir>/src/tests/mocks/fileMock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  // UI tests type into several fields; leave headroom for slow CI machines.
  testTimeout: 15_000,
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/tests/**',
    '!src/**/index.ts',
  ],
  coverageReporters: ['text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: { statements: 60, branches: 50, functions: 55, lines: 60 },
  },
};

export default config;
