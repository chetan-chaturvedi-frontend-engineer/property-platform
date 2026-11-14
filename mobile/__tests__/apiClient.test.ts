import { apiClient, ApiError } from '../src/services/api/apiClient';
import { onSessionExpired } from '../src/services/api/tokenManager';
import { secureStorage } from '../src/services/storage/secureStorage';

jest.mock('../src/services/storage/secureStorage', () => ({
  secureStorage: { getSession: jest.fn(), saveSession: jest.fn(), clearSession: jest.fn() },
}));

const storage = secureStorage as jest.Mocked<typeof secureStorage>;
const fetchMock = jest.fn();
const json = (status: number, body?: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

beforeEach(() => {
  jest.resetAllMocks();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

describe('apiClient', () => {
  it('sends the bearer token and returns the JSON body', async () => {
    storage.getSession.mockResolvedValue({ accessToken: 'a1', refreshToken: 'r1' });
    fetchMock.mockReturnValueOnce(json(200, { ok: true }));
    await expect(apiClient.get('/auth/me')).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer a1');
  });

  it('refreshes once on 401, stores the rotated tokens and retries', async () => {
    storage.getSession.mockResolvedValue({ accessToken: 'old', refreshToken: 'r1' });
    fetchMock
      .mockReturnValueOnce(json(401))
      .mockReturnValueOnce(json(200, { accessToken: 'new', refreshToken: 'r2' }))
      .mockReturnValueOnce(json(200, { id: 1 }));
    await expect(apiClient.get('/auth/me')).resolves.toEqual({ id: 1 });
    expect(storage.saveSession).toHaveBeenCalledWith({ accessToken: 'new', refreshToken: 'r2' });
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer new');
  });

  it('shares one refresh between concurrent 401s', async () => {
    storage.getSession.mockResolvedValue({ accessToken: 'old', refreshToken: 'r1' });
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/auth/refresh')) {
        return json(200, { accessToken: 'new', refreshToken: 'r2' });
      }
      return fetchMock.mock.calls.filter(c => c[1].headers.Authorization === 'Bearer new').length > 0
        ? json(200, {})
        : json(401);
    });
    await Promise.all([apiClient.get('/a'), apiClient.get('/b')]);
    expect(fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('clears the session and notifies when the refresh token is rejected', async () => {
    const expired = jest.fn();
    onSessionExpired(expired);
    storage.getSession.mockResolvedValue({ accessToken: 'old', refreshToken: 'r1' });
    fetchMock.mockReturnValueOnce(json(401)).mockReturnValueOnce(json(401));
    await expect(apiClient.get('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(storage.clearSession).toHaveBeenCalled();
    expect(expired).toHaveBeenCalled();
  });

  it('does not attach a token or refresh for auth: false calls', async () => {
    storage.getSession.mockResolvedValue({ accessToken: 'a1', refreshToken: 'r1' });
    fetchMock.mockReturnValueOnce(json(401, { detail: 'Invalid credentials', code: 'invalid_credentials' }));
    await expect(apiClient.post('/auth/login', {}, { auth: false })).rejects.toMatchObject({
      message: 'Invalid credentials',
      code: 'invalid_credentials',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('maps validation errors to field messages and 204 to undefined', async () => {
    storage.getSession.mockResolvedValue(null);
    fetchMock.mockReturnValueOnce(json(400, { detail: 'Validation failed', code: 'validation_failed', errors: { email: 'bad' } }));
    const error = (await apiClient.post('/auth/register', {}, { auth: false }).catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.fieldErrors).toEqual({ email: 'bad' });
    fetchMock.mockReturnValueOnce(json(204));
    await expect(apiClient.delete('/x')).resolves.toBeUndefined();
  });
});
