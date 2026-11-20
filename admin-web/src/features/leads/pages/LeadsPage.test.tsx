import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';
import { STORAGE_KEYS } from '@/utils/constants';

import { LeadsPage } from './LeadsPage';

/** The mock has 28 leads, ids 300 down to 273 (see leadMockData). */
const TOTAL = 28;
/** A smaller page than the default keeps these wide-table tests fast. */
const PAGE = 10;

function renderPage(path = '/leads') {
  window.localStorage.setItem(STORAGE_KEYS.leadsPageSize, JSON.stringify(PAGE));
  // The app's client, so writes refresh lists and stats like in the browser.
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/leads', element: <LeadsPage /> },
      { path: '/leads/:id', element: <p>Lead details page</p> },
    ],
    { initialPath: path, queryClient },
  );
}

function table() {
  return screen.getByRole('table', { name: 'Leads' });
}

async function findRow(text: string) {
  const cell = await within(table()).findByText(text);
  const row = cell.closest('tr');
  if (!row) throw new Error('row not found');
  return within(row);
}

async function waitForRows(count: number) {
  await waitFor(() => expect(within(table()).getAllByRole('row')).toHaveLength(count + 1));
}

/** The longest flows (many interactions over a wide table) get more time on slow machines. */
const LONG_FLOW_MS = 30_000;

describe('LeadsPage', () => {
  it('shows statistics, status counts and the first page of leads', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const stats = screen.getByRole('region', { name: 'Lead statistics' });
    expect(await within(stats).findByText(String(TOTAL))).toBeInTheDocument();
    expect(within(stats).getByText('New leads')).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'New (4)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: `All leads (${TOTAL})` })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await waitForRows(PAGE);
    expect(screen.getByText(`1–${PAGE} of ${TOTAL}`)).toBeInTheDocument();
    const first = await findRow('LID-300');
    expect(first.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(first.getByText('Website')).toBeInTheDocument();
    expect(first.getByText('New')).toBeInTheDocument();
    expect(first.getByText('Asha Admin')).toBeInTheDocument();
  });

  it(
    'filters by status tab and debounced search, and clears everything',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage();
      await waitForRows(PAGE);

      await user.click(await screen.findByRole('tab', { name: 'Lost (3)' }));
      await waitForRows(3);
      expect(router.state.location.search).toBe('?status=lost');

      await user.type(screen.getByRole('searchbox', { name: 'Search leads' }), 'meera');
      await waitForRows(1);
      expect((await findRow('LID-293')).getByText('Meera Nair')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Clear filters' }));
      await waitForRows(PAGE);
      expect(screen.getByRole('searchbox', { name: 'Search leads' })).toHaveValue('');
      expect(router.state.location.search).toBe('');
    },
    LONG_FLOW_MS,
  );

  it('applies and resets the filter panel', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(PAGE);
    const panel = within(screen.getByRole('region', { name: 'Lead filters' }));

    await user.click(panel.getByRole('combobox', { name: 'Source' }));
    await user.click(screen.getByRole('option', { name: 'Referral' }));
    // Nothing changes until the filters are applied.
    expect(within(table()).getAllByRole('row')).toHaveLength(PAGE + 1);
    await user.click(panel.getByRole('button', { name: 'Apply filters' }));
    await waitForRows(4);
    expect(within(table()).getAllByText('Referral')).toHaveLength(4);

    // Applying remounts the panel with the new values, so it is looked up again.
    const applied = within(screen.getByRole('region', { name: 'Lead filters' }));
    expect(applied.getByRole('combobox', { name: 'Source' })).toHaveTextContent('Referral');
    await user.click(applied.getByRole('button', { name: 'Reset filters' }));
    await waitForRows(PAGE);
  });

  it('rejects a created-to date before the created-from date', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(PAGE);
    const panel = within(screen.getByRole('region', { name: 'Lead filters' }));

    await user.type(panel.getByLabelText('Created from'), '2026-11-10');
    await user.type(panel.getByLabelText('Created to'), '2026-11-01');

    expect(panel.getByText('Before the start date')).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Apply filters' })).toBeDisabled();
  });

  it('sorts by a column in both directions', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    await waitForRows(PAGE);

    await user.click(screen.getByRole('button', { name: 'Lead' }));
    await waitFor(() => expect(router.state.location.search).toBe('?sort=leadName&dir=asc'));
    await waitFor(() =>
      expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('Amit Rajput'),
    );

    await user.click(screen.getByRole('button', { name: 'Lead' }));
    await waitFor(() =>
      expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('Vikram Patel'),
    );
  });

  it(
    'validates and creates a lead',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      await waitForRows(PAGE);

      await user.click(screen.getByRole('button', { name: 'Add new lead' }));
      const dialog = within(await screen.findByRole('dialog', { name: 'Add new lead' }));
      await user.click(dialog.getByRole('button', { name: 'Create lead' }));
      expect(await dialog.findByText('Enter the lead name')).toBeInTheDocument();
      expect(dialog.getByText('Enter a phone number')).toBeInTheDocument();
      expect(dialog.getByText('Select a purpose')).toBeInTheDocument();

      await user.type(dialog.getByRole('textbox', { name: /Lead name/ }), 'Ravi Kumar');
      await user.type(dialog.getByRole('textbox', { name: /^Email/ }), 'not-an-email');
      await user.type(dialog.getByRole('textbox', { name: /^Phone/ }), '98765 00000');
      await user.click(dialog.getByRole('combobox', { name: /Purpose/ }));
      await user.click(screen.getByRole('option', { name: 'Buy' }));
      await user.click(dialog.getByRole('button', { name: 'Create lead' }));
      expect(await dialog.findByText('Enter a valid email address')).toBeInTheDocument();

      await user.clear(dialog.getByRole('textbox', { name: /^Email/ }));
      await user.type(dialog.getByRole('textbox', { name: /^Email/ }), 'ravi@example.com');
      await user.click(dialog.getByRole('button', { name: 'Create lead' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(mockDb.leads()[0]).toMatchObject({
        leadName: 'Ravi Kumar',
        email: 'ravi@example.com',
        purpose: 'buy',
        createdBy: { id: 1 },
      });
      expect(
        await screen.findByRole('tab', { name: `All leads (${TOTAL + 1})` }),
      ).toBeInTheDocument();
      expect(useNotificationStore.getState().queue.map((item) => item.message)).toContain(
        'Lead created.',
      );
    },
    LONG_FLOW_MS,
  );

  it('shows server field errors on the form', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.post(apiPath('/admin/leads'), () =>
        problem(400, 'validation_failed', 'Validation failed', {
          errors: { phone: 'must be a valid phone number' },
        }),
      ),
    );
    const { user } = renderPage();
    await waitForRows(PAGE);

    await user.click(screen.getByRole('button', { name: 'Add new lead' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Add new lead' }));
    await user.type(dialog.getByRole('textbox', { name: /Lead name/ }), 'Ravi Kumar');
    await user.type(dialog.getByRole('textbox', { name: /^Phone/ }), '98765 00000');
    await user.click(dialog.getByRole('combobox', { name: /Purpose/ }));
    await user.click(screen.getByRole('option', { name: 'Rent' }));
    await user.click(dialog.getByRole('button', { name: 'Create lead' }));

    expect(await dialog.findByText('must be a valid phone number')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add new lead' })).toBeInTheDocument();
  });

  it('edits a lead from its row with the saved values', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();

    await user.click((await findRow('LID-300')).getByRole('button', { name: 'Edit Rahul Sharma' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit Rahul Sharma' }));
    const name = await dialog.findByRole('textbox', { name: /Lead name/ });
    expect(name).toHaveValue('Rahul Sharma');
    expect(dialog.getByRole('textbox', { name: /Preferred location/ })).toHaveValue(
      'Vaishali Nagar, Jaipur',
    );

    await user.clear(name);
    await user.type(name, 'Rahul S. Sharma');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockDb.findLead(300)?.leadName).toBe('Rahul S. Sharma');
    expect(await within(table()).findByText('Rahul S. Sharma')).toBeInTheDocument();
  });

  it('asks before deleting and removes the lead', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();

    await user.click(
      (await findRow('LID-300')).getByRole('button', { name: 'Delete Rahul Sharma' }),
    );
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete lead?' }));
    expect(dialog.getByText('Rahul Sharma')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Delete lead' }));

    await waitFor(() => expect(within(table()).queryByText('LID-300')).not.toBeInTheDocument());
    expect(mockDb.findLead(300)).toBeUndefined();
    expect(
      await screen.findByRole('tab', { name: `All leads (${TOTAL - 1})` }),
    ).toBeInTheDocument();
  });

  it('opens a lead from its row', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();

    await user.click((await findRow('LID-300')).getByRole('button', { name: 'View Rahul Sharma' }));

    expect(router.state.location.pathname).toBe('/leads/300');
  });

  it('shows only viewing to a read-only role', async () => {
    signInAs(mockUsers.leadViewer);
    renderPage();

    const row = await findRow('LID-300');
    expect(row.getByRole('button', { name: 'View Rahul Sharma' })).toBeInTheDocument();
    expect(row.queryByRole('button', { name: 'Edit Rahul Sharma' })).not.toBeInTheDocument();
    expect(row.queryByRole('button', { name: 'Delete Rahul Sharma' })).not.toBeInTheDocument();
    expect(row.queryByRole('button', { name: 'Assign Rahul Sharma' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add new lead' })).not.toBeInTheDocument();
    // Filtering by assignee needs the user list, which this role lacks.
    expect(screen.queryByRole('combobox', { name: 'Assigned to' })).not.toBeInTheDocument();
  });

  it('shows distinct empty states for no data and no matches', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/leads?q=nobody-matches');

    expect(await screen.findByText(/No leads match these filters/)).toBeInTheDocument();

    for (const lead of [...mockDb.leads()]) mockDb.deleteLead(lead.id);
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('No leads have been added yet.')).toBeInTheDocument();
  });

  it('shows an error with a retry when the list fails', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.get(apiPath('/admin/leads'), () => problem(500, 'internal_error', 'Server unavailable')),
    );
    renderPage();

    expect(await screen.findByText('Server unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
