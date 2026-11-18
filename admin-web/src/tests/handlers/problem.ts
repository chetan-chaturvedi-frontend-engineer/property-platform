import { HttpResponse } from 'msw';

/** An RFC 9457 error response shaped like the backend's. */
export function problem(
  status: number,
  code: string,
  detail: string,
  extra: { errors?: Record<string, string>; headers?: Record<string, string> } = {},
) {
  return HttpResponse.json(
    { status, title: code, detail, code, ...(extra.errors ? { errors: extra.errors } : {}) },
    { status, headers: { 'Content-Type': 'application/problem+json', ...extra.headers } },
  );
}

/** Matches the path on any origin, so handlers work for relative and absolute base URLs. */
export const apiPath = (path: string) => `*/api/v1${path}`;

/** Same rule as the backend: state-changing admin requests need the CSRF token, or 403 csrf_invalid. */
export function csrfRejection(request: Request, expectedToken: string) {
  return request.headers.get('X-XSRF-TOKEN') === expectedToken
    ? null
    : problem(403, 'csrf_invalid', 'The CSRF token is missing or invalid.');
}
