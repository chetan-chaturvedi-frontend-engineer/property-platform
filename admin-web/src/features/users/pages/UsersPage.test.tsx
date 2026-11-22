import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderWithProviders, signInAs } from '@/tests/utils/testUtils';

import { UsersPage } from './UsersPage';

/** The mock has 44 users: 33 generated, 5 staff and 6 builder accounts (see mockDb). */
const TOTAL = 44;

function renderPage() {
  // The app's client, so writes refresh lists and stats like in the browser.
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderWithProviders(<UsersPage />, { queryClient, route: '/users' });
}

function table() {
  return screen.getByRole('table', { name: 'Users' });
}

async function findRow(name: RegExp | string) {
  const cell = await within(table()).findByText(name);
  const row = cell.closest('tr');
  if (!row) throw new Error('row not found');
  return within(row);
}

/** Captures CSV downloads (jsdom has no object URLs). */
function captureDownloads() {
  const blobs: Blob[] = [];
  Object.assign(URL, {
    createObjectURL: jest.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:csv';
    }),
    revokeObjectURL: jest.fn(),
  });
  // jsdom cannot follow the download link ("Not implemented: navigation").
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  return blobs;
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);

async function waitForRows(count: number) {
  await waitFor(() => expect(within(table()).getAllByRole('row')).toHaveLength(count + 1));
}

describe('UsersPage', () => {
  it('shows live statistics, status tab counts and the first page of users', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const stats = screen.getByRole('region', { name: 'User statistics' });
    expect(await within(stats).findByText(String(TOTAL))).toBeInTheDocument();
    expect(within(stats).getByText('25')).toBeInTheDocument();
    expect(within(stats).getByText('Pending users')).toBeInTheDocument();
    expect(within(stats).getByText('56.8% of all users')).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Pending (6)' })).toBeInTheDocument();

    await waitForRows(20);
    expect(screen.getByText(`Showing 1 to 20 of ${TOTAL} entries`)).toBeInTheDocument();
  });

  it('shows role names resolved from the roles table', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    expect((await findRow('Mira Manager')).getByText('Manager')).toBeInTheDocument();
    expect((await findRow('Sam Super')).getByText('Super Admin')).toBeInTheDocument();
  });

  it('shows user (with phone), role, email, status and date columns', async () => {
    signInAs(mockUsers.admin);
    renderPage();
    await waitForRows(20);

    const headers = within(table())
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headers).toEqual([
      'User',
      'Role',
      'Email',
      'Status',
      'Joined on',
      'Last Active',
      'Actions',
    ]);
    const row = await findRow('Mira Manager');
    expect(row.getByText('manager@example.com')).toHaveAttribute('title', 'manager@example.com');
    expect(row.getByText('Active')).toBeInTheDocument();
  });

  it('filters blocked (suspended) users with the Blocked tab', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(20);

    await user.click(await screen.findByRole('tab', { name: /^blocked/i }));
    await waitFor(() => {
      const rows = within(table()).getAllByRole('row').slice(1);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row).toHaveTextContent('Blocked');
    });
  });

  it('exports the filtered users as CSV', async () => {
    signInAs(mockUsers.admin);
    const blobs = captureDownloads();
    const { user } = renderPage();
    await waitForRows(20);

    await user.click(await screen.findByRole('tab', { name: /^inactive/i }));
    await waitForRows(5);
    await user.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => expect(blobs).toHaveLength(1));
    const lines = (await blobs[0]!.text()).trim().split('\r\n');
    expect(lines[0]).toContain('Name,Phone,Email,Role,Status,Joined date (UTC)');
    expect(lines).toHaveLength(6);
    expect(lines.slice(1).every((line) => line.includes(',Inactive,'))).toBe(true);
    expect(messages()).toContain('Exported 5 users.');
  });

  it('reports a failed export', async () => {
    signInAs(mockUsers.admin);
    const blobs = captureDownloads();
    const { user } = renderPage();
    await waitForRows(20);
    server.use(
      http.get(apiPath('/admin/users'), () =>
        problem(500, 'internal_error', 'The server had a problem.'),
      ),
    );

    await user.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => expect(messages()).toContain('Export failed: The server had a problem.'));
    expect(blobs).toHaveLength(0);
  });

  it('combines status tab, dynamic role filter and search, and clears them', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(20);

    await user.click(await screen.findByRole('tab', { name: /^inactive/i }));
    await waitForRows(5);
    expect(within(table()).getAllByText('Inactive')).toHaveLength(5);

    await user.click(screen.getByRole('tab', { name: /^all users/i }));
    await user.click(screen.getByLabelText('Role'));
    // Options come from GET /admin/users/roles; inactive roles stay available for filtering.
    expect(await screen.findByRole('option', { name: 'Legacy Partner (inactive)' })).toBeVisible();
    await user.click(screen.getByRole('option', { name: 'Sales Executive' }));
    await waitForRows(4);

    // Every sales executive in the mock is a Rohit; one of them is a Kapoor. (Digits would also
    // match phone numbers.)
    await user.type(screen.getByRole('searchbox', { name: 'Search users' }), 'kapoor');
    await waitForRows(1);

    await user.type(screen.getByRole('searchbox', { name: 'Search users' }), 'zzz');
    expect(await screen.findByText('No users match these filters.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    await waitForRows(20);
    expect(screen.getByRole('searchbox', { name: 'Search users' })).toHaveValue('');
  });

  it('filters by joined date range and rejects an inverted range', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(20);

    await user.type(screen.getByLabelText('Joined from'), '2026-11-18');
    await waitForRows(6);

    await user.type(screen.getByLabelText('Joined to'), '2026-11-01');
    expect(await screen.findByText('Must not be before the start date')).toBeInTheDocument();
  });

  it('sorts by column headers', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(20);

    await user.click(within(table()).getByRole('button', { name: 'User' }));
    await waitFor(() =>
      expect(within(table()).getByRole('columnheader', { name: /user/i })).toHaveAttribute(
        'aria-sort',
        'ascending',
      ),
    );
    await waitFor(() => expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('Aman'));

    await user.click(within(table()).getByRole('button', { name: 'Role' }));
    await waitFor(() =>
      expect(within(table()).getByRole('columnheader', { name: /role/i })).toHaveAttribute(
        'aria-sort',
        'ascending',
      ),
    );
  });

  it('adds a user with a role from the roles table, then refreshes list and stats', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await screen.findByRole('tab', { name: `All users (${TOTAL})` });

    await user.click(screen.getByRole('button', { name: /add new user/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Add new user' });
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Create user' })).toBeEnabled(),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }));
    expect(await within(dialog).findByText('Name must be at least 2 characters')).toBeVisible();
    expect(within(dialog).getByText('Select a role')).toBeVisible();
    expect(within(dialog).getByText('Confirm the password')).toBeVisible();

    await user.type(within(dialog).getByLabelText(/full name/i), 'Kiran Rao');
    await user.type(within(dialog).getByLabelText(/^email/i), 'kiran@example.com');
    await user.type(within(dialog).getByLabelText(/^phone/i), '+91 91234 56789');
    await user.click(within(dialog).getByLabelText(/^role/i));
    const labels = (await screen.findAllByRole('option')).map((option) => option.textContent);
    // Only assignable roles: never super admin or inactive roles.
    expect(labels).not.toContain('Super Admin');
    expect(labels).not.toContain('Legacy Partner');
    await user.click(screen.getByRole('option', { name: 'Sales Executive' }));
    await user.click(within(dialog).getByLabelText(/^status/i));
    await user.click(await screen.findByRole('option', { name: 'Active' }));
    await user.type(within(dialog).getByLabelText(/^password/i), 'Str0ng!Pass');
    await user.type(within(dialog).getByLabelText(/confirm password/i), 'Str0ng!Pass');
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }));

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(
      await screen.findByRole('tab', { name: `All users (${TOTAL + 1})` }),
    ).toBeInTheDocument();
    const row = await findRow('Kiran Rao');
    expect(row.getByText('Sales Executive')).toBeInTheDocument();
    expect(row.getByText('Active')).toBeInTheDocument();
    const created = mockDb.managedUsers().find((u) => u.email === 'kiran@example.com');
    expect(created?.userType).toBe('sales-executive');
    // Created active with "Sign-in ready" (checked by default): the email counts as verified.
    expect(created?.emailVerified).toBe(true);
    expect(useNotificationStore.getState().queue.map((item) => item.message)).toContain(
      'User created.',
    );
  });

  it('offers sign-in ready only for active accounts, and can leave the email unverified', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();

    await user.click(await screen.findByRole('button', { name: /add new user/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Add new user' });
    // Default status is pending: verification stays with the user.
    expect(
      within(dialog).queryByRole('checkbox', { name: 'Sign-in ready' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByText('The user must verify their email or phone before signing in'),
    ).toBeVisible();

    await user.type(within(dialog).getByLabelText(/full name/i), 'Later Verified');
    await user.type(within(dialog).getByLabelText(/^email/i), 'later@example.com');
    await user.click(within(dialog).getByLabelText(/^role/i));
    await user.click(await screen.findByRole('option', { name: 'User' }));
    await user.click(within(dialog).getByLabelText(/^status/i));
    await user.click(await screen.findByRole('option', { name: 'Active' }));
    const checkbox = within(dialog).getByRole('checkbox', { name: 'Sign-in ready' });
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    await user.type(within(dialog).getByLabelText(/^password/i), 'Str0ng!Pass');
    await user.type(within(dialog).getByLabelText(/confirm password/i), 'Str0ng!Pass');
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }));

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    const created = mockDb.managedUsers().find((u) => u.email === 'later@example.com');
    expect(created?.status).toBe('active');
    expect(created?.emailVerified).toBe(false);
  });

  it('puts a duplicate email error from the server on the email field', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();

    await user.click(screen.getByRole('button', { name: /add new user/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Add new user' });
    await user.type(within(dialog).getByLabelText(/full name/i), 'Copy Cat');
    await user.type(within(dialog).getByLabelText(/^email/i), 'manager@example.com');
    await user.click(within(dialog).getByLabelText(/^role/i));
    await user.click(await screen.findByRole('option', { name: 'User' }));
    await user.type(within(dialog).getByLabelText(/^password/i), 'Str0ng!Pass');
    await user.type(within(dialog).getByLabelText(/confirm password/i), 'Str0ng!Pass');
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }));

    expect(await within(dialog).findByText('is already in use')).toBeVisible();
    expect(within(dialog).getByLabelText(/^email/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('without USER_CHANGE_STATUS, creates pending accounts with no status field', async () => {
    signInAs(mockUsers.editor);
    const { user } = renderPage();

    await user.click(await screen.findByRole('button', { name: /add new user/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Add new user' });
    expect(within(dialog).queryByLabelText(/^status/i)).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('checkbox', { name: 'Sign-in ready' }),
    ).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/full name/i), 'Pending Person');
    await user.type(within(dialog).getByLabelText(/^email/i), 'pending@example.com');
    await user.click(within(dialog).getByLabelText(/^role/i));
    await user.click(await screen.findByRole('option', { name: 'User' }));
    await user.type(within(dialog).getByLabelText(/^password/i), 'Str0ng!Pass');
    await user.type(within(dialog).getByLabelText(/confirm password/i), 'Str0ng!Pass');
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }));

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(mockDb.managedUsers().find((u) => u.email === 'pending@example.com')?.status).toBe(
      'pending',
    );
  });

  it('without USER_CHANGE_STATUS or USER_DELETE, locks status on edit and hides delete', async () => {
    signInAs(mockUsers.editor);
    const { user } = renderPage();

    const row = await findRow('Uma User');
    expect(row.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    await user.click(row.getByRole('button', { name: 'Edit Uma User' }));
    const edit = await screen.findByRole('dialog', { name: 'Edit Uma User' });
    expect(within(edit).getByText('You are not allowed to change account status')).toBeVisible();
  });

  it('edits a user with the form prefilled and sends only changed fields', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();

    const row = await findRow('Uma User');
    await user.click(row.getByRole('button', { name: 'Edit Uma User' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Uma User' });
    const name = within(dialog).getByLabelText(/full name/i);
    expect(name).toHaveValue('Uma User');
    expect(within(dialog).getByLabelText(/^email/i)).toHaveValue('user@example.com');
    expect(within(dialog).queryByLabelText(/^password/i)).not.toBeInTheDocument();

    await user.clear(name);
    await user.type(name, 'Uma U. User');
    await user.click(within(dialog).getByLabelText(/^status/i));
    // An account never returns to pending.
    expect(screen.queryByRole('option', { name: 'Pending' })).not.toBeInTheDocument();
    // Suspended accounts are labelled "Blocked".
    await user.click(screen.getByRole('option', { name: 'Blocked' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect((await findRow('Uma U. User')).getByText('Blocked')).toBeInTheDocument();
    expect(mockDb.findManagedUser(mockUsers.appUser.id)?.status).toBe('suspended');
  });

  it('does not let admins change their own role or status, or delete themselves', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();

    const row = await findRow('Asha Admin');
    expect(row.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    await user.click(row.getByRole('button', { name: 'Edit Asha Admin' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('You cannot change your own role')).toBeInTheDocument();
    expect(within(dialog).getByText('You cannot change your own status')).toBeInTheDocument();
  });

  it('offers no edit or delete for accounts the admin may not manage', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const row = await findRow('Sam Super');
    expect(row.getByRole('button', { name: 'View Sam Super' })).toBeInTheDocument();
    expect(row.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(row.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows the server message when the backend refuses a change', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.patch(apiPath('/admin/users/:id'), () =>
        problem(
          403,
          'user_role_forbidden',
          'You can only manage users and assign roles whose permissions you hold yourself.',
        ),
      ),
    );
    const { user } = renderPage();

    const row = await findRow('Uma User');
    await user.click(row.getByRole('button', { name: 'Edit Uma User' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Uma User' });
    await user.type(within(dialog).getByLabelText(/full name/i), 'x');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'You can only manage users and assign roles whose permissions you hold yourself.',
    );
  });

  it('deletes a user after confirmation and refreshes the counts', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await screen.findByRole('tab', { name: `All users (${TOTAL})` });

    const row = await findRow('Mira Manager');
    await user.click(row.getByRole('button', { name: 'Delete Mira Manager' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete user?' });
    expect(dialog).toHaveTextContent('Mira Manager');
    expect(dialog).toHaveTextContent('manager@example.com');

    await user.click(within(dialog).getByRole('button', { name: 'Delete user' }));

    expect(
      await screen.findByRole('tab', { name: `All users (${TOTAL - 1})` }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(within(table()).queryByText('Mira Manager')).not.toBeInTheDocument(),
    );
    expect(mockDb.findManagedUser(mockUsers.manager.id)).toBeUndefined();
  });

  it('cancelling the delete dialog keeps the user', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();

    const row = await findRow('Mira Manager');
    await user.click(row.getByRole('button', { name: 'Delete Mira Manager' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete user?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(mockDb.findManagedUser(mockUsers.manager.id)).toBeDefined();
  });

  it('shows read-only details with the resolved role in a drawer, without duplicates', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();

    const row = await findRow('Mira Manager');
    await user.click(row.getByRole('button', { name: 'View Mira Manager' }));

    const drawer = await screen.findByRole('dialog', { name: 'User details' });
    expect(await within(drawer).findByText('manager@example.com')).toBeInTheDocument();
    expect(within(drawer).getByText('Contact')).toBeInTheDocument();
    expect(within(drawer).getByText('Manager')).toBeInTheDocument();
    // Status once (in the header); no role slug and no user ID.
    expect(within(drawer).getAllByText('Active')).toHaveLength(1);
    expect(within(drawer).queryByText('Status')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('manager')).not.toBeInTheDocument();
    expect(within(drawer).queryByText(/user id/i)).not.toBeInTheDocument();
    expect(within(drawer).queryByText(/role slug/i)).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(drawer).not.toBeInTheDocument());
  });

  it('view-only roles see no add, edit or delete actions', async () => {
    signInAs(mockUsers.manager);
    renderPage();

    const row = await findRow('Asha Admin');
    expect(row.getByRole('button', { name: 'View Asha Admin' })).toBeInTheDocument();
    expect(row.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(row.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add new user/i })).not.toBeInTheDocument();
  });

  it('shows an error with retry when the list cannot be loaded', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.get(apiPath('/admin/users'), () =>
        problem(500, 'internal_error', 'The server had a problem.'),
      ),
    );
    renderPage();

    expect(await screen.findByText('The server had a problem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows an empty state when there are no users', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.get(apiPath('/admin/users'), () =>
        Response.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
      ),
    );
    renderPage();

    expect(await screen.findByText('No users have been added yet.')).toBeInTheDocument();
  });
});
