import { useAuthStore } from '@/store/authStore';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';

import { authService } from './authService';

describe('authService.restoreSession (page load)', () => {
  beforeEach(() => useAuthStore.setState({ status: 'unknown', user: null }));

  it('signs the user in from a live session cookie', async () => {
    mockDb.startSession(mockUsers.admin);

    await authService.restoreSession();

    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user: { id: 1 } });
  });

  it('rotates the session when only the refresh cookie is still valid', async () => {
    mockDb.startSession(mockUsers.manager);
    mockDb.expireAccessToken();

    await authService.restoreSession();

    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user: { id: 2 } });
    expect(mockDb.sessionUser()?.id).toBe(2);
  });

  it('is anonymous without a session', async () => {
    await authService.restoreSession();

    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', user: null });
  });

  it('is anonymous when the session was revoked', async () => {
    mockDb.startSession(mockUsers.admin);
    mockDb.revokeSession();

    await authService.restoreSession();

    expect(useAuthStore.getState().status).toBe('anonymous');
  });
});

describe('authService login and logout', () => {
  it('login starts a cookie session and returns only the user, never tokens', async () => {
    const session = await authService.login({
      identifier: 'admin@example.com',
      password: 'Admin@1234',
    });

    expect(session.user.email).toBe('admin@example.com');
    expect(session).not.toHaveProperty('accessToken');
    expect(session).not.toHaveProperty('refreshToken');
    expect(mockDb.sessionUser()?.id).toBe(1);
  });

  it('logout ends the server session, refreshing an expired access cookie first', async () => {
    mockDb.startSession(mockUsers.admin);
    useAuthStore.getState().setSession(mockUsers.admin);
    mockDb.expireAccessToken();

    await authService.logout();

    expect(mockDb.sessionUser()).toBeUndefined();
  });
});
