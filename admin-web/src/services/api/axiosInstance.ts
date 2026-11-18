import axios, { type CreateAxiosDefaults } from 'axios';

import { env } from '@/config/env';

import { attachCsrf } from './csrf';
import { attachInterceptors } from './interceptors';

const defaults: CreateAxiosDefaults = {
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  headers: { Accept: 'application/json' },
  // The session is a pair of HttpOnly cookies; send and accept them, also when the API is on
  // another origin of the same site (the backend allows the dashboard's origin with credentials).
  withCredentials: true,
  // The CSRF token comes from GET /admin/csrf (see csrf.ts); the XSRF cookie itself is HttpOnly.
  withXSRFToken: false,
};

/**
 * Client without the refresh interceptor, used for the session refresh and the CSRF token: a failing
 * refresh must never trigger another refresh.
 */
export const authClient = axios.create(defaults);

/** The client every feature service uses. */
export const apiClient = axios.create(defaults);

attachCsrf(authClient, authClient);
attachCsrf(apiClient, authClient);
attachInterceptors(apiClient, authClient);
