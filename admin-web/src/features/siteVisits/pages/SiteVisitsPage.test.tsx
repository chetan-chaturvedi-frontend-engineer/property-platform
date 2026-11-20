import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';
import { STORAGE_KEYS } from '@/utils/constants';

import { addDays, propertyNow } from '../utils/siteVisitDisplay';

import { SiteVisitsPage } from './SiteVisitsPage';

/**
 * The mock has 36 visits, ids 200 down to 165, six of each status (see siteVisitMockData). Sorted by
 * visit date (newest first), SV-100181 (Priya Rana, confirmed) is first.
 */
const TOTAL = 36;
const PAGE = 10;
const LONG_FLOW_MS = 30_000;

function renderPage(path = '/site-visits') {
  window.localStorage.setItem(STORAGE_KEYS.siteVisitsPageSize, JSON.stringify(PAGE));
  // The app's client, so writes refresh lists and stats like in the browser.
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes([{ path: '/site-visits', element: <SiteVisitsPage /> }], {
    initialPath: path,
    queryClient,
  });
}

const table = () => screen.getByRole('table', { name: 'Site visits' });

async function findRow(text: string) {
  const cell = await within(table()).findByText(text);
  const row = cell.closest('tr');
  if (!row) throw new Error('row not found');
  return within(row);
}

async function waitForRows(count: number) {
  await waitFor(() => expect(within(table()).getAllByRole('row')).toHaveLength(count + 1));
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);

describe('SiteVisitsPage', () => {
  it('shows statistics, status counts, charts and the first page of visits', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const stats = screen.getByRole('region', { name: 'Site visit statistics' });
    expect(await within(stats).findByText(String(TOTAL))).toBeInTheDocument();
    expect(within(stats).getByText('Upcoming visits')).toBeInTheDocument();
    expect(within(stats).getByText('18')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: `All visits (${TOTAL})` })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'No show (6)' })).toBeInTheDocument();
    const byType = screen.getByRole('region', { name: 'Visits by type' });
    expect(within(byType).getByText('7 (19%)')).toBeInTheDocument();

    await waitForRows(PAGE);
    expect(screen.getByText(`Showing 1 to ${PAGE} of ${TOTAL} entries`)).toBeInTheDocument();
    const first = await findRow('SV-100181');
    expect(first.getByText('Priya Rana')).toBeInTheDocument();
    expect(first.getByText('Confirmed')).toBeInTheDocument();
    expect(first.getByRole('button', { name: 'Actions for SV-100181' })).toBeInTheDocument();

    const recent = screen.getByRole('region', { name: 'Recently updated' });
    expect(await within(recent).findAllByRole('listitem')).toHaveLength(5);
  });

  it(
    'filters by status tab and debounced search, and clears everything',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage();
      await waitForRows(PAGE);

      await user.click(await screen.findByRole('tab', { name: 'Cancelled (6)' }));
      await waitForRows(6);
      expect(router.state.location.search).toBe('?status=cancelled');

      await user.type(screen.getByRole('searchbox', { name: 'Search site visits' }), 'SV-100196');
      await waitForRows(1);
      expect((await findRow('SV-100196')).getByText('Cancelled')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Clear filters' }));
      await waitForRows(PAGE);
      expect(screen.getByRole('searchbox', { name: 'Search site visits' })).toHaveValue('');
      expect(router.state.location.search).toBe('');
    },
    LONG_FLOW_MS,
  );

  it('pages through the results with numbered pagination', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    await waitForRows(PAGE);

    await user.click(screen.getByRole('button', { name: 'Go to page 4' }));
    await waitForRows(TOTAL - 3 * PAGE);
    expect(router.state.location.search).toBe('?page=3');
    expect(screen.getByText(`Showing 31 to ${TOTAL} of ${TOTAL} entries`)).toBeInTheDocument();
  });

  it('sorts by status through the API', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    await waitForRows(PAGE);

    await user.click(screen.getByRole('button', { name: 'Status' }));
    await waitFor(() => expect(router.state.location.search).toBe('?sort=status&dir=asc'));
    await waitFor(() =>
      expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('Cancelled'),
    );
  });

  it(
    'schedules a visit through the form',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      await waitForRows(PAGE);

      // The header button; Quick actions has the same shortcut.
      const [headerButton] = screen.getAllByRole('button', { name: 'Schedule visit' });
      if (!headerButton) throw new Error('Schedule button missing');
      await user.click(headerButton);
      const dialog = within(await screen.findByRole('dialog', { name: 'Schedule site visit' }));

      // Required fields are checked before anything is sent.
      await user.click(dialog.getByRole('button', { name: 'Schedule visit' }));
      expect(await dialog.findByText('Select a property')).toBeInTheDocument();
      expect(dialog.getByText('Enter the visitor name')).toBeInTheDocument();
      expect(dialog.getByText('Select the visit time')).toBeInTheDocument();

      await user.type(dialog.getByRole('combobox', { name: 'Property' }), 'Skyline');
      const [skyline] = await screen.findAllByRole('option', { name: /Skyline Residency/ });
      if (!skyline) throw new Error('property option missing');
      await user.click(skyline);
      const date = dialog.getByLabelText(/Visit date/);
      await user.clear(date);
      await user.type(date, addDays(propertyNow().date, 2));
      await user.type(dialog.getByLabelText(/Visit time/), '10:30');
      await user.type(dialog.getByRole('textbox', { name: 'Customer name' }), 'Ravi Kumar');
      await user.type(dialog.getByRole('textbox', { name: 'Contact number' }), '98765 43210');
      await user.click(dialog.getByRole('button', { name: 'Schedule visit' }));

      await waitFor(() => expect(messages()).toContain('Site visit scheduled.'));
      expect(screen.queryByRole('dialog', { name: 'Schedule site visit' })).not.toBeInTheDocument();
      const stats = screen.getByRole('region', { name: 'Site visit statistics' });
      expect(await within(stats).findByText(String(TOTAL + 1))).toBeInTheDocument();
      const created = mockDb.siteVisits()[0];
      expect(created).toMatchObject({
        name: 'Ravi Kumar',
        mobile: '+919876543210',
        status: 'scheduled',
        visitTime: '10:30:00',
      });
      expect(created?.property.projectName).toMatch(/^Skyline Residency/);
    },
    LONG_FLOW_MS,
  );

  it(
    'cancels a visit with a reason and only offers valid transitions',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      const row = await findRow('SV-100181');

      await user.click(row.getByRole('button', { name: 'Actions for SV-100181' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Change status' }));
      const dialog = within(
        await screen.findByRole('dialog', { name: 'Change status of SV-100181' }),
      );

      await user.click(dialog.getByRole('combobox', { name: /New status/ }));
      // The visit is in the future, so it cannot be completed yet; it is already confirmed.
      expect(screen.getByRole('option', { name: /Completed/ })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(screen.getByRole('option', { name: /Confirmed/ })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.click(screen.getByRole('option', { name: /Cancelled/ }));

      await user.click(dialog.getByRole('button', { name: 'Cancel visit' }));
      expect(await dialog.findByText('Enter the reason for cancelling')).toBeInTheDocument();
      await user.type(
        dialog.getByRole('textbox', { name: /Cancellation reason/ }),
        'Client travelling',
      );
      await user.click(dialog.getByRole('button', { name: 'Cancel visit' }));

      await waitFor(() => expect(messages()).toContain('Status updated.'));
      expect(mockDb.findSiteVisit(181)).toMatchObject({
        status: 'cancelled',
        cancellationReason: 'Client travelling',
      });
      expect((await findRow('SV-100181')).getByText('Cancelled')).toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );

  it('reschedules an upcoming visit, which marks it rescheduled', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const row = await findRow('SV-100181');

    await user.click(row.getByRole('button', { name: 'Actions for SV-100181' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Reschedule' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reschedule SV-100181' }));
    const date = dialog.getByLabelText(/New date/);
    await user.clear(date);
    await user.type(date, addDays(propertyNow().date, 3));
    await user.click(dialog.getByRole('button', { name: 'Reschedule' }));

    await waitFor(() => expect(messages()).toContain('Site visit rescheduled.'));
    expect(mockDb.findSiteVisit(181)?.status).toBe('rescheduled');
  });

  it('shows the details of a visit in a printable drawer', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const row = await findRow('SV-100181');

    await user.click(row.getByRole('button', { name: 'Actions for SV-100181' }));
    await user.click(await screen.findByRole('menuitem', { name: 'View details' }));

    expect(
      await screen.findByRole('heading', { name: 'Site visit SV-100181' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print visit details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit visit' })).toBeInTheDocument();
    const visitor = within(screen.getByRole('region', { name: 'Visitor' }));
    expect(visitor.getByText('Priya Rana')).toBeInTheDocument();
  });

  it('deletes one visit after confirmation', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const row = await findRow('SV-100181');

    await user.click(row.getByRole('button', { name: 'Actions for SV-100181' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete site visit?' }));
    await user.click(dialog.getByRole('button', { name: 'Delete visit' }));

    await waitFor(() => expect(messages()).toContain('Site visit deleted.'));
    expect(mockDb.findSiteVisit(181)).toBeUndefined();
    await waitFor(() => expect(within(table()).queryByText('SV-100181')).not.toBeInTheDocument());
  });

  it(
    'deletes the selected visits in bulk',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      await waitForRows(PAGE);

      await user.click(screen.getByRole('checkbox', { name: 'Select SV-100181' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select SV-100182' }));
      const bar = within(screen.getByRole('region', { name: 'Bulk actions' }));
      expect(bar.getByText('2 selected')).toBeInTheDocument();
      await user.click(bar.getByRole('button', { name: 'Delete' }));
      const dialog = within(await screen.findByRole('dialog', { name: 'Delete 2 site visits?' }));
      await user.click(dialog.getByRole('button', { name: 'Delete 2 visits' }));

      await waitFor(() => expect(messages()).toContain('2 site visits deleted.'));
      expect(mockDb.siteVisits()).toHaveLength(TOTAL - 2);
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );

  it('switches to the calendar view and back', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    await waitForRows(PAGE);

    await user.click(screen.getByRole('button', { name: 'Calendar view' }));
    expect(router.state.location.search).toBe('?view=calendar');
    const calendar = await screen.findByRole('region', { name: 'Site visit calendar' });
    expect(within(calendar).getByRole('table')).toBeInTheDocument();
    expect(within(calendar).getAllByRole('columnheader')).toHaveLength(7);

    await user.click(screen.getByRole('button', { name: 'List view' }));
    await waitForRows(PAGE);
  });

  it('exports the filtered visits as CSV', async () => {
    signInAs(mockUsers.admin);
    const createObjectURL = jest.fn(() => 'blob:visits');
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { user } = renderPage('/site-visits?status=completed');
    await waitForRows(6);

    await user.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(messages()).toContain('Exported 6 visits.'));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('hides actions the viewer is not permitted to use', async () => {
    signInAs(mockUsers.siteVisitViewer);
    renderPage();
    await waitForRows(PAGE);

    expect(screen.queryByRole('button', { name: 'Schedule visit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Actions for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /^Select/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Quick actions' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Manage agents/ })).not.toBeInTheDocument();
  });

  it('shows an error with a retry when the list cannot be loaded', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.get(apiPath('/admin/site-visits'), () => problem(500, 'internal_error', 'Server down')),
    );
    renderPage();

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Try again' }).length).toBeGreaterThan(0);
  });
});
