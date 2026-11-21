import { act, waitFor } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';

import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import {
  useCreateUser,
  useDeleteUser,
  userKeys,
  useUpdateUser,
  useUser,
  useUserRoles,
  useUsers,
  useUserStats,
} from './useUsers';

describe('useUsers', () => {
  it('loads a page of users and caches it under the filter key', async () => {
    signInAs(mockUsers.admin);
    const filters = { page: 0, size: 5 };

    const { result, queryClient } = renderHookWithQuery(() => useUsers(filters));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.content).toHaveLength(5);
    expect(result.current.data?.totalElements).toBe(38);
    expect(queryClient.getQueryData(userKeys.list(filters))).toEqual(result.current.data);
  });

  it('passes status, role, search and sort to the API', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() =>
      useUsers({
        page: 0,
        size: 100,
        status: 'pending',
        userType: 'user',
        sort: 'fullName,asc',
        createdTo: '2026-11-18',
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const rows = result.current.data?.content ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((user) => user.status === 'pending' && user.userType === 'user')).toBe(true);
    const names = rows.map((user) => user.fullName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    const search = renderHookWithQuery(() => useUsers({ page: 0, search: 'asha' }));
    await waitFor(() => expect(search.result.current.isSuccess).toBe(true));
    expect(search.result.current.data?.content.map((user) => user.email)).toEqual([
      'admin@example.com',
    ]);
  });

  it('exposes a normalized ApiError when the role lacks the permission', async () => {
    signInAs(mockUsers.manager);
    server.use(
      http.get(apiPath('/admin/users'), () => problem(403, 'access_denied', 'Access denied.')),
    );

    const { result } = renderHookWithQuery(() => useUsers({ page: 0 }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.isForbidden).toBe(true);
  });
});

describe('useUserStats', () => {
  it('returns the total and a count for every status', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() => useUserStats());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      total: 38,
      byStatus: { pending: 6, active: 20, suspended: 3, rejected: 2, inactive: 5, closed: 2 },
    });
  });
});

describe('useUserRoles', () => {
  it('lists every role with whether the admin may assign it', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() => useUserRoles());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const assignable = Object.fromEntries(
      (result.current.data ?? []).map((role) => [role.slug, role.assignable]),
    );
    expect(assignable).toEqual({
      admin: true,
      editor: true,
      'legacy-partner': false,
      manager: true,
      'role-viewer': true,
      'sales-executive': true,
      'super-admin': false,
      user: true,
    });
  });

  it('does not offer roles with more dashboard access than the caller has', async () => {
    signInAs(mockUsers.editor);

    const { result } = renderHookWithQuery(() => useUserRoles());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const admin = result.current.data?.find((role) => role.slug === 'admin');
    expect(admin?.assignable).toBe(false);
    // App roles carry app-only permissions the editor lacks, but grant no dashboard access.
    expect(result.current.data?.find((role) => role.slug === 'user')?.assignable).toBe(true);
  });
});

describe('useUser', () => {
  it('loads one user and stays idle without an id', async () => {
    signInAs(mockUsers.admin);

    const idle = renderHookWithQuery(() => useUser(null));
    expect(idle.result.current.fetchStatus).toBe('idle');

    const { result } = renderHookWithQuery(() => useUser(mockUsers.manager.id));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.fullName).toBe('Mira Manager');
  });

  it('reports a missing user as 404', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() => useUser(99_999));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(404);
  });
});

describe('user mutations', () => {
  it('create, update and delete change the data and refresh cached lists and stats', async () => {
    signInAs(mockUsers.admin);
    // The app's client: its MutationCache applies `meta.invalidates` and success toasts.
    const { result } = renderHookWithQuery(
      () => ({
        stats: useUserStats(),
        create: useCreateUser(),
        update: useUpdateUser(),
        remove: useDeleteUser(),
      }),
      createQueryClient(),
    );
    await waitFor(() => expect(result.current.stats.isSuccess).toBe(true));

    let createdId = 0;
    await act(async () => {
      const created = await result.current.create.mutateAsync({
        fullName: 'New Person',
        email: 'new.person@example.com',
        phone: '+91 90000 11111',
        password: 'Str0ng!Pass',
        passwordConfirmation: 'Str0ng!Pass',
        userType: 'sales-executive',
        status: 'active',
        emailVerified: true,
      });
      createdId = created.id;
      expect(created.role).toEqual({
        slug: 'sales-executive',
        name: 'Sales Executive',
        active: true,
      });
      expect(created.phone).toBe('+919000011111');
      expect(created.emailVerified).toBe(true);
    });
    await waitFor(() => expect(result.current.stats.data?.total).toBe(39));

    await act(async () => {
      const updated = await result.current.update.mutateAsync({
        id: createdId,
        request: { status: 'inactive', phone: null },
      });
      expect(updated.status).toBe('inactive');
      expect(updated.phone).toBeNull();
    });
    await waitFor(() => expect(result.current.stats.data?.byStatus.inactive).toBe(6));

    await act(async () => {
      await result.current.remove.mutateAsync(createdId);
    });
    await waitFor(() => expect(result.current.stats.data?.total).toBe(38));
    expect(mockDb.findManagedUser(createdId)).toBeUndefined();
    expect(useNotificationStore.getState().queue.map((item) => item.message)).toEqual([
      'User created.',
      'User updated.',
      'User deleted.',
    ]);
  });

  it('rejects a duplicate email with a field error', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useCreateUser());

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          fullName: 'Copy Cat',
          email: 'manager@example.com',
          password: 'Str0ng!Pass',
          passwordConfirmation: 'Str0ng!Pass',
          userType: 'user',
          status: 'active',
        }),
      ).rejects.toMatchObject({ status: 409, fieldErrors: { email: 'is already in use' } });
    });
  });
});
