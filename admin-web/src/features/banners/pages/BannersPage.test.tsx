import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';
import { STORAGE_KEYS } from '@/utils/constants';

import { BannersPage } from './BannersPage';

/**
 * 12 banners, newest first: 12 Summer promo … 1 Find your dream home. Live: 1, 2, 3, 7, 8, 11, 12;
 * scheduled: 5, 6; expired: 9; inactive: 4, 10. See bannerMockData.
 */
const TOTAL = 12;
const PAGE = 10;
const LONG_FLOW_MS = 30_000;

function renderPage(path = '/banners') {
  window.localStorage.setItem(STORAGE_KEYS.bannersPageSize, JSON.stringify(PAGE));
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/banners', element: <BannersPage /> },
      { path: '/banners/new', element: <p>Create form</p> },
      { path: '/banners/:id/edit', element: <p>Edit form</p> },
    ],
    { initialPath: path, queryClient },
  );
}

const table = () => screen.getByRole('table', { name: 'Banners' });

async function findRow(title: string) {
  const cell = await within(table()).findByText(title);
  const row = cell.closest('tr');
  if (!row) throw new Error('row not found');
  return within(row);
}

async function waitForRows(count: number) {
  await waitFor(() => expect(within(table()).getAllByRole('row')).toHaveLength(count + 1));
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);

describe('BannersPage', () => {
  it('shows the overview cards and the first page with status and schedule', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const stats = screen.getByRole('region', { name: 'Banner statistics' });
    expect(await within(stats).findByText(String(TOTAL))).toBeInTheDocument();
    expect(within(stats).getByText('7')).toBeInTheDocument();
    expect(within(stats).getByText('All time · 1 expired')).toBeInTheDocument();
    expect(within(stats).getByText('Scheduled banners')).toBeInTheDocument();

    await waitForRows(PAGE);
    expect(screen.getByText(`Showing 1 to ${PAGE} of ${TOTAL} entries`)).toBeInTheDocument();

    const monsoon = await findRow('Monsoon sale');
    expect(monsoon.getByText('Expired')).toBeInTheDocument();
    expect(monsoon.getByText('Offer')).toBeInTheDocument();
    expect(monsoon.getByText('Property listing')).toBeInTheDocument();
    expect(monsoon.getByRole('img', { name: 'Monsoon sale' })).toHaveAttribute(
      'src',
      expect.stringMatching(/\/api\/v1\/admin\/banners\/9\/image\/seed-9\.png$/),
    );

    const deals = await findRow('Exclusive deals & offers');
    expect(deals.getByText('Inactive')).toBeInTheDocument();
    expect(deals.getByLabelText('No schedule')).toBeInTheDocument();
    expect((await findRow('Invest in the future')).getByText('Scheduled')).toBeInTheDocument();
  });

  it(
    'filters by status, type and search, and pages through the rest',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage();
      await waitForRows(PAGE);

      await user.click(screen.getByRole('button', { name: 'Go to next page' }));
      await waitForRows(TOTAL - PAGE);
      expect(router.state.location.search).toContain('page=1');

      await user.click(screen.getByRole('combobox', { name: 'Status' }));
      await user.click(await screen.findByRole('option', { name: 'Scheduled' }));
      await waitForRows(2);
      expect(router.state.location.search).toBe('?state=scheduled');
      await findRow('Download our app');

      await user.click(screen.getByRole('combobox', { name: 'Status' }));
      await user.click(await screen.findByRole('option', { name: 'Inactive' }));
      await user.click(screen.getByRole('combobox', { name: 'Banner type' }));
      await user.click(await screen.findByRole('option', { name: 'Promotion' }));
      await waitForRows(1);
      await findRow('Home loan partners');

      await user.click(screen.getByRole('button', { name: 'Clear all' }));
      await waitFor(() => expect(router.state.location.search).toBe(''));
      await waitForRows(PAGE);
      await user.type(screen.getByRole('searchbox', { name: 'Search banners' }), 'sale');
      await waitFor(() => expect(router.state.location.search).toBe('?q=sale'));
      await waitForRows(1);
      await findRow('Monsoon sale');

      await user.clear(screen.getByRole('searchbox', { name: 'Search banners' }));
      await user.type(screen.getByRole('searchbox', { name: 'Search banners' }), 'zzz');
      expect(await screen.findByText('No matching banners')).toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );

  it('applies link and date filters from the panel, shown as removable chips', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(PAGE);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    const panel = await screen.findByRole('region', { name: 'Banner filters' });
    await user.click(within(panel).getByRole('combobox', { name: 'Link type' }));
    await user.click(await screen.findByRole('option', { name: 'External link' }));
    await user.click(within(panel).getByRole('button', { name: 'Apply filters' }));

    await waitForRows(3);
    const chips = screen.getByRole('region', { name: 'Applied filters' });
    await user.click(within(chips).getByLabelText('Remove filter External link'));
    await waitForRows(PAGE);
  });

  it('sorts by a column header on the server', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    await waitForRows(PAGE);
    await user.click(screen.getByRole('button', { name: 'Banner' }));
    await waitFor(() => expect(router.state.location.search).toBe('?sort=title&dir=asc'));
    await waitFor(() => {
      const first = within(table()).getAllByRole('row')[1];
      expect(within(first as HTMLElement).getByText('Diwali festive offer')).toBeInTheDocument();
    });
  });

  it('opens the details drawer with schedule, link and activity', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const row = await findRow('Weekend open house');
    await user.click(row.getByRole('button', { name: 'Actions for Weekend open house' }));
    await user.click(await screen.findByRole('menuitem', { name: 'View details' }));

    const drawer = await screen.findByRole('presentation');
    expect(await within(drawer).findByText('#11')).toBeInTheDocument();
    expect(within(drawer).getByText('/pages/open-house')).toBeInTheDocument();
    expect(within(drawer).getByRole('region', { name: 'Activity' })).toBeInTheDocument();
    expect(
      await within(drawer).findByRole('list', { name: 'Banner activity' }),
    ).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Edit banner' })).toBeInTheDocument();
  });

  it('deactivates a banner after confirmation and refreshes the counts', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const row = await findRow('Weekend open house');
    await user.click(row.getByRole('button', { name: 'Actions for Weekend open house' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Deactivate banner' });
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(messages()).toContain('Banner status updated.'));
    expect(mockDb.findBanner(11)?.status).toBe('inactive');
    await waitFor(async () =>
      expect((await findRow('Weekend open house')).getByText('Inactive')).toBeInTheDocument(),
    );
  });

  it('deletes a banner after showing it in the confirmation', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const row = await findRow('Summer promo');
    await user.click(row.getByRole('button', { name: 'Actions for Summer promo' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog', { name: 'Delete banner' });
    expect(within(dialog).getByText('Summer promo')).toBeInTheDocument();
    expect(within(dialog).getByText(/live now and will disappear/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(messages()).toContain('Banner deleted.'));
    expect(mockDb.findBanner(12)).toBeUndefined();
    await waitFor(() =>
      expect(within(table()).queryByText('Summer promo')).not.toBeInTheDocument(),
    );
  });

  it(
    'bulk-activates and bulk-deletes the selected banners',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      await waitForRows(PAGE);

      await user.click(screen.getByRole('checkbox', { name: 'Select Home loan partners' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select Monsoon sale' }));
      const bar = screen.getByRole('region', { name: 'Bulk actions' });
      expect(within(bar).getByText('2 selected')).toBeInTheDocument();

      await user.click(within(bar).getByRole('button', { name: 'Activate' }));
      const activate = await screen.findByRole('dialog', { name: 'Activate banners' });
      expect(
        within(activate).getByText(/1 banner already active will be skipped/),
      ).toBeInTheDocument();
      await user.click(within(activate).getByRole('button', { name: 'Activate' }));
      await waitFor(() => expect(messages()).toContain('1 banner activated.'));
      expect(mockDb.findBanner(10)?.status).toBe('active');

      await user.click(screen.getByRole('checkbox', { name: 'Select Home loan partners' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select Monsoon sale' }));
      await user.click(
        within(screen.getByRole('region', { name: 'Bulk actions' })).getByRole('button', {
          name: 'Delete',
        }),
      );
      const remove = await screen.findByRole('dialog', { name: 'Delete 2 banners' });
      await user.click(within(remove).getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(messages()).toContain('2 banners deleted.'));
      expect(mockDb.banners()).toHaveLength(TOTAL - 2);
    },
    LONG_FLOW_MS,
  );

  it('navigates to the add and edit forms', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    const row = await findRow('Diwali festive offer');
    await user.click(row.getByRole('button', { name: 'Edit Diwali festive offer' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/banners/7/edit'));
    void router.navigate('/banners');
    await user.click(await screen.findByRole('button', { name: 'Add new banner' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/banners/new'));
  });

  it('hides the actions a role may not use', async () => {
    signInAs(mockUsers.bannerEditor);
    const { user } = renderPage();
    const row = await findRow('Diwali festive offer');
    await user.click(row.getByRole('button', { name: 'Actions for Diwali festive offer' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Deactivate' })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('shows an error with retry when the list fails, and an empty state without banners', async () => {
    signInAs(mockUsers.admin);
    // Only the table request fails; the count requests (size=1) still succeed.
    server.use(
      http.get(apiPath('/admin/banners'), ({ request }) =>
        new URL(request.url).searchParams.get('size') === '1'
          ? undefined
          : problem(500, 'server_error', 'Server unavailable.'),
      ),
    );
    const { user } = renderPage();
    expect(await screen.findByText('Server unavailable.')).toBeInTheDocument();

    server.resetHandlers();
    mockDb.banners().forEach((banner) => mockDb.softDeleteBanner(banner.id));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No banners yet')).toBeInTheDocument();
  });
});
