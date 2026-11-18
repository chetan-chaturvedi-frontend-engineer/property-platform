import { isAxiosError } from 'axios';

import type { ProblemDetail } from '@/types/api.types';

const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'The request was invalid.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do this.',
  404: 'The requested resource was not found.',
  409: 'This was changed by someone else. Reload and try again.',
  413: 'The request is too large.',
  429: 'Too many attempts. Please wait and try again.',
};

/** Every failed API call is rejected with this, never with a raw Axios error. */
export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;
  readonly retryAfterSeconds: number | null;

  constructor(options: {
    message: string;
    status: number | null;
    code: string;
    fieldErrors?: Record<string, string>;
    retryAfterSeconds?: number | null;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors ?? {};
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }

  get isNetworkError(): boolean {
    return this.code === 'network_error' || this.code === 'timeout';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isValidationError(): boolean {
    return this.status === 400 && Object.keys(this.fieldErrors).length > 0;
  }
}

function isProblemDetail(data: unknown): data is ProblemDetail {
  return (
    typeof data === 'object' &&
    data !== null &&
    ('status' in data || 'code' in data || 'detail' in data)
  );
}

function parseRetryAfter(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

/** Normalizes anything thrown by an API call. Idempotent. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({
        message: 'The server took too long to respond.',
        status: null,
        code: 'timeout',
      });
    }
    if (error.code === 'ERR_CANCELED') {
      return new ApiError({
        message: 'The request was cancelled.',
        status: null,
        code: 'cancelled',
      });
    }
    const response = error.response;
    if (!response) {
      return new ApiError({
        message: 'Cannot reach the server. Check your connection and try again.',
        status: null,
        code: 'network_error',
      });
    }
    const problem: ProblemDetail = isProblemDetail(response.data) ? response.data : {};
    const status = response.status;
    return new ApiError({
      // `detail` is written by the backend for users; stack traces and SQL are never included.
      message:
        problem.detail ?? FALLBACK_MESSAGES[status] ?? 'Something went wrong. Please try again.',
      status,
      code: problem.code ?? `http_${status}`,
      fieldErrors: problem.errors ?? {},
      retryAfterSeconds: parseRetryAfter(response.headers['retry-after']),
    });
  }
  return new ApiError({
    message: 'An unexpected error occurred.',
    status: null,
    code: 'unknown_error',
  });
}

export function getErrorMessage(error: unknown): string {
  return toApiError(error).message;
}
