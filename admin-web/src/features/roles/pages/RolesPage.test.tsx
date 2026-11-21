import { screen, waitFor, within } from '@testing-library/react';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { ALL_PERMISSION_CODES } from '@/tests/mocks/roleMockData';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';

import { RolesPage } from './RolesPage';

/**
 * Mock roles by name: Administrator (the admin's own role), Legacy Partner (inactive), Manager, Role
 * Viewer, Sales Executive, Super Admin, User, User Editor. See mockDb `buildRoles`.
 */
const LONG_FLOW_MS = 30_000;

function renderPage(path = '/roles-permissions') {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/roles-permissions', element: <RolesPage /> },
      { path: '/users', element: <p>Users page</p> },
    ],
    { initialPath: path, queryClient },
  );
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);
const rolesList = () => screen.getByRole('list', { name: 'Roles' });
const roleButton = async (name: RegExp) =>
  within(await screen.findByRole('list', { name: 'Roles' })).findByRole('button', { name });
const editor = (roleName: string) => screen.findByRole('form', { name: `Edit ${roleName}` });

async function openRole(
  name: RegExp,
  roleName: string,
  user: ReturnType<typeof renderPage>['user'],
) {
  await user.click(await roleButton(name));
  return within(await editor(roleName));
}

describe('RolesPage', () => {
  it('shows the statistics, the roles and the first role, which is the admin’s own', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const stats = within(screen.getByRole('region', { name: 'Role statistics' }));
    expect(await stats.findByText('8')).toBeInTheDocument();
    expect(stats.getByText(String(ALL_PERMISSION_CODES.length))).toBeInTheDocument();
    expect(stats.getByText('3')).toBeInTheDocument();
    expect(stats.getByText('7 active')).toBeInTheDocument();

    await waitFor(() => expect(within(rolesList()).getAllByRole('listitem')).toHaveLength(8));
    const own = within(await editor('Administrator'));
    expect(within(rolesList()).getByRole('button', { name: /^Administrator/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(own.getByText(/This is your own role/)).toBeInTheDocument();
    expect(own.getByRole('checkbox', { name: 'View — Users' })).toBeDisabled();
    expect(own.getByRole('checkbox', { name: 'View — Users' })).toBeChecked();
    // Details of the own role stay editable.
    expect(own.getByRole('textbox', { name: 'Role name' })).toBeEnabled();
    expect(own.getByRole('textbox', { name: 'Role slug' })).toHaveValue('admin');
  });

  it(
    'grants a permission, shows unsaved changes and saves them',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage();
      const form = await openRole(/^User Editor/, 'User Editor', user);
      expect(router.state.location.search).toContain(`role=${mockDb.findRole('editor')?.id}`);

      const remove = form.getByRole('checkbox', { name: 'Delete — Users' });
      expect(remove).not.toBeChecked();
      await user.click(remove);
      expect(form.getByText('Unsaved changes (+1 / −0 permissions)')).toBeInTheDocument();

      await user.click(form.getByRole('button', { name: 'Save changes' }));
      await waitFor(() => expect(messages()).toContain('Role saved.'));
      expect(mockDb.findRole('editor')?.permissions).toContain('USER_DELETE');
      const saved = within(await editor('User Editor'));
      await waitFor(() =>
        expect(saved.getByRole('checkbox', { name: 'Delete — Users' })).toBeChecked(),
      );
      expect(saved.queryByText(/Unsaved changes/)).not.toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );

  it(
    'keeps the module checkbox in step with its actions, and resets without saving',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      const form = await openRole(/^User Editor/, 'User Editor', user);

      const all = form.getByRole('checkbox', { name: 'All Users permissions (4 of 6)' });
      expect(all).toHaveAttribute('data-indeterminate', 'true');
      await user.click(all);
      expect(form.getByRole('checkbox', { name: 'All Users permissions (6 of 6)' })).toBeChecked();
      expect(form.getByRole('checkbox', { name: 'Delete — Users' })).toBeChecked();

      await user.click(form.getByRole('checkbox', { name: 'All Users permissions (6 of 6)' }));
      expect(form.getByRole('checkbox', { name: 'View — Users' })).not.toBeChecked();

      await user.click(form.getByRole('button', { name: 'Reset' }));
      expect(
        form.getByRole('checkbox', { name: 'All Users permissions (4 of 6)' }),
      ).toBeInTheDocument();
      expect(form.getByRole('button', { name: 'Save changes' })).toBeDisabled();
      expect(mockDb.findRole('editor')?.permissions).not.toContain('USER_DELETE');
    },
    LONG_FLOW_MS,
  );

  it(
    'asks before switching roles with unsaved changes',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      const form = await openRole(/^User Editor/, 'User Editor', user);
      await user.click(form.getByRole('checkbox', { name: 'Delete — Users' }));

      await user.click(within(rolesList()).getByRole('button', { name: /^Manager/ }));
      const dialog = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(await editor('User Editor')).toBeInTheDocument();

      await user.click(within(rolesList()).getByRole('button', { name: /^Manager/ }));
      await user.click(
        within(await screen.findByRole('dialog', { name: 'Discard unsaved changes?' })).getByRole(
          'button',
          {
            name: 'Discard and switch',
          },
        ),
      );
      expect(await editor('Manager')).toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );

  it(
    'searches permissions and expands modules that matched by action',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      const form = await openRole(/^User Editor/, 'User Editor', user);
      const matrix = within(form.getByRole('table', { name: 'Permissions of User Editor' }));

      await user.type(form.getByRole('searchbox', { name: 'Search permissions' }), 'publish');
      expect(matrix.getByRole('rowheader', { name: /FAQs/ })).toBeInTheDocument();
      expect(matrix.getByRole('rowheader', { name: /Pages/ })).toBeInTheDocument();
      expect(matrix.queryByRole('rowheader', { name: /^Users/ })).not.toBeInTheDocument();
      expect(form.getByRole('group', { name: 'FAQs permissions' })).toHaveTextContent(
        'FAQ_PUBLISH',
      );

      await user.clear(form.getByRole('searchbox', { name: 'Search permissions' }));
      await user.type(
        form.getByRole('searchbox', { name: 'Search permissions' }),
        'nothing-like-this',
      );
      expect(form.getByText('No matching permissions')).toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );

  it('shows the super admin role read-only', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const form = await openRole(/^Super Admin/, 'Super Admin', user);

    expect(form.getByText(/managed by the system/)).toBeInTheDocument();
    expect(form.getByRole('textbox', { name: 'Role name' })).toBeDisabled();
    expect(form.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(
      form.getByRole('checkbox', { name: 'All Admin Panel permissions (1 of 1)' }),
    ).toBeDisabled();
  });

  it(
    'creates a role with a generated slug and opens it',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      await editor('Administrator');

      await user.click(screen.getAllByRole('button', { name: 'Add new role' })[0] as HTMLElement);
      const dialog = within(await screen.findByRole('dialog', { name: 'Add new role' }));
      await user.type(dialog.getByRole('textbox', { name: 'Role name' }), 'Content Team');
      expect(dialog.getByRole('textbox', { name: 'Role slug' })).toHaveValue('content-team');
      await user.click(await dialog.findByRole('checkbox', { name: 'View — FAQs' }));
      await user.click(dialog.getByRole('button', { name: 'Create role' }));

      await waitFor(() => expect(messages()).toContain('Role created.'));
      expect(mockDb.findRole('content-team')?.permissions).toEqual(['FAQ_VIEW']);
      const form = within(await editor('Content Team'));
      expect(form.getByRole('checkbox', { name: 'View — FAQs' })).toBeChecked();
    },
    LONG_FLOW_MS,
  );

  it(
    'shows server validation errors in the create form',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      await editor('Administrator');

      await user.click(screen.getAllByRole('button', { name: 'Add new role' })[0] as HTMLElement);
      const dialog = within(await screen.findByRole('dialog', { name: 'Add new role' }));
      await user.type(dialog.getByRole('textbox', { name: 'Role name' }), 'manager');
      await user.click(dialog.getByRole('button', { name: 'Create role' }));
      expect(await dialog.findByText('is already in use')).toBeInTheDocument();
      expect(mockDb.roles()).toHaveLength(8);
    },
    LONG_FLOW_MS,
  );

  it(
    'deletes an unassigned role and explains why others cannot be deleted',
    async () => {
      signInAs(mockUsers.admin);
      mockDb.saveRole({
        id: 50,
        slug: 'temp',
        name: 'Temporary',
        description: null,
        active: true,
        permissions: ['FAQ_VIEW'],
        createdAt: '2026-11-01T09:00:00Z',
        updatedAt: '2026-11-01T09:00:00Z',
      });
      const { user } = renderPage();
      await editor('Administrator');

      await user.click(within(rolesList()).getByRole('button', { name: 'Actions for Manager' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
      const blocked = within(await screen.findByRole('dialog', { name: 'Role cannot be deleted' }));
      expect(blocked.getByText(/assigned to 1 user/)).toBeInTheDocument();
      await user.click(blocked.getByRole('button', { name: 'OK' }));

      await user.click(within(rolesList()).getByRole('button', { name: 'Actions for Temporary' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
      const dialog = within(await screen.findByRole('dialog', { name: 'Delete role' }));
      await user.click(dialog.getByRole('button', { name: 'Delete role' }));
      await waitFor(() => expect(messages()).toContain('Role deleted.'));
      expect(mockDb.findRole('temp')).toBeUndefined();
      await waitFor(() =>
        expect(within(rolesList()).queryByText('Temporary')).not.toBeInTheDocument(),
      );
    },
    LONG_FLOW_MS,
  );

  it(
    'shows role details, permissions and assigned users read-only',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      await editor('Administrator');

      await user.click(
        within(rolesList()).getByRole('button', { name: 'Actions for User Editor' }),
      );
      await user.click(await screen.findByRole('menuitem', { name: 'View details' }));
      const dialog = within(await screen.findByRole('dialog', { name: 'User Editor' }));
      expect(await dialog.findByText('editor@example.com')).toBeInTheDocument();
      const permissions = within(dialog.getByRole('region', { name: 'Assigned permissions' }));
      expect(permissions.getByText('Users')).toBeInTheDocument();
      expect(permissions.getByText('Create')).toBeInTheDocument();
      expect(dialog.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users');
      expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );

  it('is read-only for an admin who can only view roles', async () => {
    signInAs(mockUsers.roleViewer);
    renderPage();
    const form = within(await editor('Administrator'));

    expect(screen.queryByRole('button', { name: 'Add new role' })).not.toBeInTheDocument();
    expect(form.getByText('You do not have permission to edit roles.')).toBeInTheDocument();
    expect(form.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(form.getByRole('textbox', { name: 'Role name' })).toBeDisabled();
  });

  it(
    'filters the roles by search and keeps the search in the URL',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage();
      await editor('Administrator');

      await user.click(screen.getByRole('searchbox', { name: 'Search roles' }));
      await user.paste('enquir');
      await waitFor(() => expect(within(rolesList()).getAllByRole('listitem')).toHaveLength(1));
      expect(within(rolesList()).getByText('Sales Executive')).toBeInTheDocument();
      expect(router.state.location.search).toContain('q=enquir');

      await user.clear(screen.getByRole('searchbox', { name: 'Search roles' }));
      await user.paste('zzz');
      expect(await screen.findByText('No matching roles')).toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );
});
