import { env } from '../../config/env';
import { ApiProblem } from '../../types/api';
import { getAccessToken, refreshAccessToken } from './tokenManager';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Stable backend error code, e.g. `verification_required`. */
    public readonly code?: string,
    /** Per-field validation messages from a 400 response. */
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  /** false for login/register/OTP: no bearer header and no refresh-and-retry on 401. */
  auth?: boolean;
  /** Extra headers, e.g. Idempotency-Key. */
  headers?: Record<string, string>;
}

/** Backend errors are RFC 9457 problem details; prefer their fields, never leak raw bodies. */
async function toApiError(response: Response): Promise<ApiError> {
  let problem: ApiProblem = {};
  try {
    problem = ((await response.json()) ?? {}) as ApiProblem;
  } catch {
    // Non-JSON error body: fall through to the generic message.
  }
  const message =
    typeof problem.detail === 'string' && problem.detail.length > 0
      ? problem.detail
      : `Request failed (${response.status})`;
  return new ApiError(message, response.status, problem.code, problem.errors);
}

async function send(method: Method, path: string, body: unknown, token: string | null, extra: Record<string, string> = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.requestTimeoutMs);
  try {
    return await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        // Multipart bodies get their boundary from fetch, so no Content-Type is set for them.
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(method: Method, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth !== false;
  const token = useAuth ? await getAccessToken() : null;
  let response = await send(method, path, body, token, options.headers);
  if (response.status === 401 && token) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      response = await send(method, path, body, fresh, options.headers);
    }
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  // 204 No Content (e.g. DELETE) has no body to parse.
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/** Centralized HTTP client: base URL, auth header, token refresh, timeout and error mapping live here only. */
export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
  /** Multipart upload (files); `form` is sent as is. */
  postForm: <T>(path: string, form: FormData, options?: RequestOptions) => request<T>('POST', path, form, options),
};
