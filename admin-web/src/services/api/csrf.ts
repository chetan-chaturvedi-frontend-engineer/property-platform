import { type AxiosInstance, isAxiosError } from 'axios';

import { API_ENDPOINTS } from './apiEndpoints';

interface CsrfToken {
  headerName: string;
  token: string;
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Set on the single retry after a CSRF rejection. */
    retriedAfterCsrf?: boolean;
  }
}

const SAFE_METHODS = new Set(['get', 'head', 'options']);

/**
 * The CSRF token lives in memory. The backend keeps its copy in an HttpOnly XSRF-TOKEN cookie and
 * hands this one out at GET /admin/csrf, so the double-submit check also works when the dashboard
 * and the API are on different hosts.
 */
let current: CsrfToken | null = null;
let inFlight: Promise<CsrfToken> | null = null;

export function fetchCsrfToken(client: AxiosInstance): Promise<CsrfToken> {
  inFlight ??= client
    .get<CsrfToken>(API_ENDPOINTS.admin.csrf)
    .then(({ data }) => {
      current = data;
      return data;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function clearCsrfToken(): void {
  current = null;
}

function isCsrfRejection(error: unknown): boolean {
  if (!isAxiosError(error) || error.response?.status !== 403) {
    return false;
  }
  const data: unknown = error.response.data;
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { code?: unknown }).code === 'csrf_invalid'
  );
}

/**
 * Adds the CSRF header to state-changing requests and, if the server rejects the token (expired
 * cookie, new browser session), fetches a fresh one and retries once. Errors are passed on unchanged
 * so later interceptors still see the Axios error.
 */
export function attachCsrf(instance: AxiosInstance, tokenClient: AxiosInstance): void {
  instance.interceptors.request.use(async (config) => {
    if (SAFE_METHODS.has((config.method ?? 'get').toLowerCase())) {
      return config;
    }
    const { headerName, token } = current ?? (await fetchCsrfToken(tokenClient));
    config.headers.set(headerName, token);
    return config;
  });

  instance.interceptors.response.use(undefined, async (error: unknown) => {
    if (
      !isCsrfRejection(error) ||
      !isAxiosError(error) ||
      !error.config ||
      error.config.retriedAfterCsrf
    ) {
      throw error;
    }
    const config = error.config;
    config.retriedAfterCsrf = true;
    clearCsrfToken();
    await fetchCsrfToken(tokenClient);
    return instance(config);
  });
}
