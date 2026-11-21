import { act, waitFor } from '@testing-library/react';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import { useRolePermissions } from './useRolePermissions';
import {
  useCreateRole,
  useDeleteRole,
  usePermissionCatalog,
  useRole,
  useRoleMembers,
  useRoles,
  useRoleStats,
  useUpdateRole,
} from './useRoles';

/** The app's client: mutation `meta` (success toasts, invalidation) is handled there. */
function appClient() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return client;
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);
const roleId = (slug: string) => mockDb.findRole(slug)?.id ?? 0;

describe('role hooks', () => {
  beforeEach(() => signInAs(mockUsers.admin));

  it('lists, searches and pages roles with user counts and flags', async () => {
    const { result } = renderHookWithQuery(() => ({
      all: useRoles({ size: 3, page: 0, sort: 'name,asc' }),
      search: useRoles({ search: 'enquir' }),
    }));

    await waitFor(() => expect(result.current.all.data).toBeDefined());
    expect(result.current.all.data).toMatchObject({ totalElements: 8, totalPages: 3 });
    const [admin] = result.current.all.data?.content ?? [];
    expect(admin).toMatchObject({
      slug: 'admin',
      ownRole: true,
      defaultRole: true,
      manageable: true,
      userCount: 1,
    });
    expect(admin?.permissions.role).toEqual({
      view: true,
      create: true,
      update: true,
      delete: true,
    });

    await waitFor(() => expect(result.current.search.data).toBeDefined());
    expect(result.current.search.data?.content.map((role) => role.slug)).toEqual([
      'sales-executive',
    ]);
  });

  it('loads stats, the permission catalog, a role and its members', async () => {
    const { result } = renderHookWithQuery(() => ({
      stats: useRoleStats(),
      catalog: usePermissionCatalog(),
      role: useRole(roleId('super-admin')),
      members: useRoleMembers('editor', 5),
    }));

    await waitFor(() => expect(result.current.stats.data).toBeDefined());
    expect(result.current.stats.data).toMatchObject({
      totalRoles: 8,
      activeRoles: 7,
      defaultRoles: 3,
    });
    await waitFor(() => expect(result.current.catalog.data).toBeDefined());
    expect(result.current.catalog.data?.[0]).toEqual({
      key: 'admin_panel',
      label: 'Admin Panel',
      actions: [{ key: 'access', code: 'ADMIN_PANEL_ACCESS' }],
    });
    await waitFor(() => expect(result.current.role.data).toBeDefined());
    expect(result.current.role.data).toMatchObject({ superAdmin: true, manageable: false });
    await waitFor(() => expect(result.current.members.data).toBeDefined());
    expect(result.current.members.data?.content.map((user) => user.email)).toEqual([
      'editor@example.com',
    ]);
  });

  it('creates, updates and deletes a role, refreshing the lists', async () => {
    const client = appClient();
    const { result } = renderHookWithQuery(
      () => ({
        stats: useRoleStats(),
        create: useCreateRole(),
        update: useUpdateRole(),
        remove: useDeleteRole(),
      }),
      client,
    );
    await waitFor(() => expect(result.current.stats.data?.totalRoles).toBe(8));

    let id = 0;
    await act(async () => {
      const created = await result.current.create.mutateAsync({
        name: 'Content Team',
        slug: 'content-team',
        permissions: { admin_panel: { access: true }, faq: { view: true } },
      });
      id = created.id;
    });
    expect(messages()).toContain('Role created.');
    await waitFor(() => expect(result.current.stats.data?.totalRoles).toBe(9));

    await act(async () => {
      const updated = await result.current.update.mutateAsync({
        id,
        request: { description: 'Writes FAQs', permissions: { faq: { view: true, create: true } } },
      });
      expect(updated.permissions).toEqual({ faq: { view: true, create: true } });
      expect(updated.description).toBe('Writes FAQs');
    });

    await act(async () => {
      await result.current.remove.mutateAsync(id);
    });
    expect(messages()).toContain('Role deleted.');
    await waitFor(() => expect(result.current.stats.data?.totalRoles).toBe(8));
    expect(mockDb.isRoleSlugTaken('content-team')).toBe(true);
  });

  it('surfaces the backend rules as errors', async () => {
    const { result } = renderHookWithQuery(() => ({
      create: useCreateRole(),
      update: useUpdateRole(),
      remove: useDeleteRole(),
    }));

    await expect(
      result.current.create.mutateAsync({ name: 'Admin Copy', slug: 'admin' }),
    ).rejects.toMatchObject({
      code: 'role_already_exists',
      fieldErrors: { slug: 'is already in use' },
    });
    await expect(
      result.current.update.mutateAsync({ id: roleId('admin'), request: { status: 'inactive' } }),
    ).rejects.toMatchObject({ code: 'role_self_modification' });
    await expect(
      result.current.update.mutateAsync({ id: roleId('super-admin'), request: { name: 'Root' } }),
    ).rejects.toMatchObject({ code: 'role_super_admin_protected' });
    await expect(result.current.remove.mutateAsync(roleId('editor'))).rejects.toMatchObject({
      code: 'role_in_use',
    });
    await expect(result.current.remove.mutateAsync(roleId('user'))).rejects.toMatchObject({
      code: 'role_default_protected',
    });
  });

  it('exposes permission flags from the signed-in admin', () => {
    signInAs(mockUsers.roleViewer);
    const { result } = renderHookWithQuery(() => useRolePermissions());
    expect(result.current).toEqual({
      canView: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canListUsers: false,
    });
  });
});
