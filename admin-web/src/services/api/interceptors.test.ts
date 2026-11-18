import { http, HttpResponse } from 'msw';

import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { signInAs } from '@/tests/utils/testUtils';

import { ApiError } from './apiError';
import { apiClient } from './axiosInstance';

/** Counts requests to a path suffix while the test runs. */
function countRequests(pathSuffix: string, method = 'POST') {
  const counter = { count: 0 };
  server.events.on('request:start', ({ request }) => {
    if (request.method === method && new URL(request.url).pathname.endsWith(pathSuffix)) {
      counter.count += 1;
    }
  });
  return counter;
}

describe('apiClient: cookie session', () => {
  afterEach(() => server.events.removeAllListeners());

  it('sends cookies with every request and never an Authorization header', async () => {
    signInAs(mockUsers.admin);
    let authorization: string | null = 'unset';
    server.use(
      http.get(apiPath('/admin/me'), ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json(mockUsers.admin);
      }),
    );

    await apiClient.get('/admin/me');

    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(authorization).toBeNull();
  });

  it('adds the CSRF token to writes only, fetching it once', async () => {
    const csrfFetches = countRequests('/admin/csrf', 'GET');
    const seen: Array<string | null> = [];
    server.use(
      http.get(apiPath('/probe'), ({ request }) => {
        seen.push(request.headers.get('X-XSRF-TOKEN'));
        return HttpResponse.json({});
      }),
      http.post(apiPath('/admin/probe'), ({ request }) => {
        seen.push(request.headers.get('X-XSRF-TOKEN'));
        return HttpResponse.json({});
      }),
    );

    await apiClient.get('/probe');
    await apiClient.post('/admin/probe');
    await apiClient.post('/admin/probe');

    expect(seen).toEqual([null, 'mock-csrf-token-1', 'mock-csrf-token-1']);
    expect(csrfFetches.count).toBe(1);
  });

  it('fetches a new CSRF token and retries once when the token is rejected', async () => {
    signInAs(mockUsers.admin);
    await apiClient.post('/admin/logout'); // caches the current token
    signInAs(mockUsers.admin);
    mockDb.rotateCsrfToken();
    const logoutCalls = countRequests('/admin/logout');

    await expect(apiClient.post('/admin/logout')).resolves.toMatchObject({ status: 200 });

    expect(logoutCalls.count).toBe(2);
  });

  it('gives up after one CSRF retry', async () => {
    server.use(
      http.post(apiPath('/admin/probe'), () =>
        HttpResponse.json({ status: 403, code: 'csrf_invalid' }, { status: 403 }),
      ),
    );
    const calls = countRequests('/admin/probe');

    await expect(apiClient.post('/admin/probe')).rejects.toMatchObject({
      status: 403,
      code: 'csrf_invalid',
    });
    expect(calls.count).toBe(2);
  });

  it('refreshes an expired access cookie once for concurrent requests and retries them', async () => {
    signInAs(mockUsers.admin);
    mockDb.expireAccessToken();
    const refreshCalls = countRequests('/admin/refresh');

    const results = await Promise.all([
      apiClient.get('/admin/me'),
      apiClient.get('/admin/me'),
      apiClient.get('/admin/me'),
    ]);

    expect(results.map((r) => (r.data as { id: number }).id)).toEqual([1, 1, 1]);
    expect(refreshCalls.count).toBe(1);
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user: { id: 1 } });
  });

  it('ends the session when the refresh is rejected, without looping', async () => {
    signInAs(mockUsers.admin);
    mockDb.revokeSession();
    const refreshCalls = countRequests('/admin/refresh');

    await expect(apiClient.get('/admin/me')).rejects.toMatchObject({ status: 401 });

    expect(refreshCalls.count).toBe(1);
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', user: null });
    expect(useNotificationStore.getState().queue[0]?.message).toMatch(/session has expired/i);
  });

  it('does not refresh when a request marked skipAuthRefresh gets 401 (e.g. wrong password)', async () => {
    signInAs(mockUsers.admin);
    const refreshCalls = countRequests('/admin/refresh');

    await expect(
      apiClient.post(
        '/admin/login',
        { identifier: 'admin@example.com', password: 'wrong' },
        { skipAuthRefresh: true },
      ),
    ).rejects.toMatchObject({ status: 401, code: 'invalid_credentials' });
    expect(refreshCalls.count).toBe(0);
  });

  it('does not try to refresh for anonymous users', async () => {
    const refreshCalls = countRequests('/admin/refresh');

    await expect(apiClient.get('/admin/me')).rejects.toBeInstanceOf(ApiError);
    expect(refreshCalls.count).toBe(0);
  });

  it('keeps the session when the refresh fails because the network is down', async () => {
    signInAs(mockUsers.admin);
    mockDb.expireAccessToken();
    server.use(http.post(apiPath('/admin/refresh'), () => HttpResponse.error()));

    await expect(apiClient.get('/admin/me')).rejects.toMatchObject({ code: 'network_error' });
    expect(useAuthStore.getState().status).toBe('authenticated');
  });
});

describe('apiClient: error normalization', () => {
  it('normalizes problem details into ApiError', async () => {
    server.use(
      http.get(apiPath('/probe'), () =>
        HttpResponse.json(
          { status: 429, code: 'rate_limited', detail: 'Too many requests.' },
          { status: 429, headers: { 'Retry-After': '120' } },
        ),
      ),
    );

    const error = (await apiClient.get('/probe').catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 429,
      code: 'rate_limited',
      message: 'Too many requests.',
      retryAfterSeconds: 120,
    });
  });

  it('maps network failures to a friendly ApiError', async () => {
    server.use(http.get(apiPath('/probe'), () => HttpResponse.error()));

    const error = (await apiClient.get('/probe').catch((e: unknown) => e)) as ApiError;

    expect(error.isNetworkError).toBe(true);
    expect(error.status).toBeNull();
    expect(error.message).toMatch(/cannot reach the server/i);
  });
});
