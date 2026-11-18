import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import { ApiError, toApiError } from './apiError';

function axiosErrorWith(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response = { status, data, headers: {}, config, statusText: '' } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response);
}

describe('toApiError', () => {
  it('reads code, detail and field errors from a problem detail', () => {
    const error = toApiError(
      axiosErrorWith(400, {
        status: 400,
        code: 'validation_failed',
        detail: 'Validation failed',
        errors: { email: 'taken' },
      }),
    );

    expect(error).toMatchObject({
      status: 400,
      code: 'validation_failed',
      fieldErrors: { email: 'taken' },
    });
    expect(error.isValidationError).toBe(true);
  });

  it('falls back to a status-based message when the body is not a problem detail', () => {
    const error = toApiError(axiosErrorWith(403, '<html>Forbidden</html>'));

    expect(error.message).toBe('You do not have permission to do this.');
    expect(error.code).toBe('http_403');
    expect(error.isForbidden).toBe(true);
  });

  it('maps timeouts', () => {
    const error = toApiError(new AxiosError('timeout', 'ECONNABORTED'));
    expect(error).toMatchObject({ code: 'timeout', status: null });
    expect(error.isNetworkError).toBe(true);
  });

  it('returns ApiError instances unchanged and wraps unknown values', () => {
    const existing = new ApiError({ message: 'x', status: 500, code: 'boom' });
    expect(toApiError(existing)).toBe(existing);
    expect(toApiError(new Error('plain'))).toMatchObject({ code: 'unknown_error', status: null });
  });
});
