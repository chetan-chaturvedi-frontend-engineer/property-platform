import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';
import { STORAGE_KEYS } from '@/utils/constants';

import { SubscriptionPlansPage } from './SubscriptionPlansPage';

/**
 * 14 plans in display order Free, Starter, Silver, Gold, Platinum, Builder Pro, Builder Enterprise,
 * Lifetime Pass, Half-Yearly Plus, Agency, Festive Offer (drafts from 9), Legacy Basic, Legacy
 * Premium, Pilot Builder (inactive). See subscriptionPlanMockData.
 */
const TOTAL = 14;
const PAGE = 10;
const LONG_FLOW_MS = 30_000;

function renderPage(path = '/packages-plans') {
  window.localStorage.setItem(STORAGE_KEYS.subscriptionPlansPageSize, JSON.stringify(PAGE));
  // The app's client, so writes refresh lists and counts like in the browser.
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes([{ path: '/packages-plans', element: <SubscriptionPlansPage /> }], {
    initialPath: path,
    queryClient,
  });
}

const table = () => screen.getByRole('table', { name: 'Subscription plans' });

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

describe('SubscriptionPlansPage', () => {
  it('shows the overview, status tabs and the first page in display order', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const stats = screen.getByRole('region', { name: 'Plan statistics' });
    expect(await within(stats).findByText(String(TOTAL))).toBeInTheDocument();
    expect(within(stats).getByText('Active plans')).toBeInTheDocument();
    expect(within(stats).getByText('57% of all plans')).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: `All plans (${TOTAL})` })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Draft (3)' })).toBeInTheDocument();

    await waitForRows(PAGE);
    expect(screen.getByText(`Showing 1 to ${PAGE} of ${TOTAL} entries`)).toBeInTheDocument();
    const rows = within(table()).getAllByRole('row');
    expect(
      within(rows[1] as HTMLElement).getByRole('checkbox', { name: 'Select Free' }),
    ).toBeInTheDocument();
    const gold = await findRow('Gold');
    expect(gold.getByText('Popular')).toBeInTheDocument();
    expect(gold.getByText('Active')).toBeInTheDocument();
    expect(gold.getByText('50 properties')).toBeInTheDocument();
  });

  it(
    'filters by tab, search and the filter panel, with removable chips',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage();
      await waitForRows(PAGE);

      await user.click(await screen.findByRole('tab', { name: 'Inactive (3)' }));
      await waitForRows(3);
      expect(router.state.location.search).toBe('?status=inactive');

      await user.type(screen.getByRole('searchbox', { name: 'Search plans' }), 'legacy');
      await waitForRows(2);

      await user.click(screen.getByRole('button', { name: 'Clear all' }));
      await waitForRows(PAGE);
      expect(router.state.location.search).toBe('');

      await user.click(screen.getByRole('button', { name: /Filters/ }));
      const panel = await screen.findByRole('region', { name: 'Plan filters' });
      await user.click(within(panel).getByRole('combobox', { name: 'Billing interval' }));
      await user.click(await screen.findByRole('option', { name: 'Year' }));
      await user.type(within(panel).getByRole('textbox', { name: 'Min price' }), '25000');
      await user.click(within(panel).getByRole('button', { name: 'Apply filters' }));

      await waitForRows(1);
      expect(await findRow('Builder Enterprise')).toBeTruthy();
      const applied = screen.getByRole('region', { name: 'Applied filters' });
      expect(within(applied).getByText('Billing: Year')).toBeInTheDocument();

      await user.click(within(applied).getByLabelText('Remove filter Price ≥ 25000'));
      await waitForRows(3);
      expect(router.state.location.search).toBe('?interval=year');
    },
    LONG_FLOW_MS,
  );

  it('sorts by price from the column header', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    await waitForRows(PAGE);

    await user.click(within(table()).getByRole('button', { name: 'Price' }));
    await waitFor(() => expect(router.state.location.search).toBe('?sort=price&dir=asc'));
    await user.click(within(table()).getByRole('button', { name: 'Price' }));
    await waitFor(() => {
      const first = within(table()).getAllByRole('row')[1] as HTMLElement;
      expect(within(first).getByText('Lifetime Pass')).toBeInTheDocument();
    });
  });

  it(
    'validates and creates a plan',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      await waitForRows(PAGE);

      await user.click(screen.getByRole('button', { name: 'Add new plan' }));
      const dialog = await screen.findByRole('dialog', { name: 'Add new plan' });
      await user.click(within(dialog).getByRole('button', { name: 'Create plan' }));
      expect(await within(dialog).findByText('Enter the plan name')).toBeInTheDocument();
      expect(within(dialog).getByText('Enter the price')).toBeInTheDocument();

      await user.type(within(dialog).getByRole('textbox', { name: /Plan name/ }), 'Diamond');
      await user.type(within(dialog).getByRole('textbox', { name: /^Price/ }), '3999');
      await user.click(within(dialog).getByRole('switch', { name: 'Unlimited properties' }));
      await user.type(
        within(dialog).getByRole('textbox', { name: 'New feature' }),
        'Video tours{Enter}',
      );
      expect(within(dialog).getByRole('textbox', { name: 'Feature 1' })).toHaveValue('Video tours');
      expect(within(dialog).getByText(/3,999\/mo/)).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Create plan' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      const created = mockDb.subscriptionPlans().find((plan) => plan.title === 'Diamond');
      expect(created).toMatchObject({
        slug: 'diamond',
        price: 3999,
        noOfProperties: null,
        features: ['Video tours'],
        status: 'draft',
      });
      expect(messages()).toContain('Plan created.');
      expect(await screen.findByRole('tab', { name: 'Draft (4)' })).toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );

  it('shows a taken slug on the slug field', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(PAGE);

    await user.click(screen.getByRole('button', { name: 'Add new plan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add new plan' });
    await user.type(within(dialog).getByRole('textbox', { name: /Plan name/ }), 'Gold again');
    await user.type(within(dialog).getByRole('textbox', { name: /^Slug/ }), 'gold');
    await user.type(within(dialog).getByRole('textbox', { name: /^Price/ }), '10');
    await user.click(within(dialog).getByRole('switch', { name: 'Unlimited properties' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create plan' }));

    expect(
      await within(dialog).findByText('Another subscription plan already uses this slug.'),
    ).toBeInTheDocument();
  });

  it(
    'edits a plan and sends only the changed fields',
    async () => {
      signInAs(mockUsers.admin);
      let sent: unknown = null;
      server.events.on('request:start', async ({ request }) => {
        if (request.method === 'PATCH' && request.url.endsWith('/subscription-plans/4')) {
          sent = await request.clone().json();
        }
      });
      const { user } = renderPage();

      await user.click((await findRow('Gold')).getByRole('button', { name: 'Actions for Gold' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
      const dialog = await screen.findByRole('dialog', { name: 'Edit Gold' });
      const price = within(dialog).getByRole('textbox', { name: /^Price/ });
      expect(price).toHaveValue('2499');
      await user.clear(price);
      await user.type(price, '2799');
      await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(sent).toEqual({ price: 2799 });
      expect(mockDb.findSubscriptionPlan(4)?.price).toBe(2799);
      server.events.removeAllListeners();
    },
    LONG_FLOW_MS,
  );

  it('opens the details drawer', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();

    await user.click((await findRow('Silver')).getByRole('button', { name: 'Actions for Silver' }));
    await user.click(await screen.findByRole('menuitem', { name: 'View details' }));
    const features = await screen.findByRole('region', { name: 'Included features' });
    expect(within(features).getByText('Featured listings')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Pricing' })).getByText('Quarterly'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit plan' })).toBeInTheDocument();
  });

  it(
    'duplicates a plan as a draft with a generated slug',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();

      await user.click((await findRow('Gold')).getByRole('button', { name: 'Actions for Gold' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Duplicate' }));
      const dialog = await screen.findByRole('dialog', { name: 'Duplicate plan' });
      expect(within(dialog).getByRole('textbox', { name: /Plan name/ })).toHaveValue(
        'Copy of Gold',
      );
      await user.click(within(dialog).getByRole('button', { name: 'Create plan' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(mockDb.subscriptionPlans().find((p) => p.title === 'Copy of Gold')).toMatchObject({
        slug: 'copy-of-gold',
        price: 2499,
        status: 'draft',
        popular: false,
      });
    },
    LONG_FLOW_MS,
  );

  it('deactivates a plan after confirmation', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();

    await user.click(
      (await findRow('Starter')).getByRole('button', { name: 'Actions for Starter' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Deactivate plan' });
    expect(within(dialog).getByText(/Existing subscribers keep their terms/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(mockDb.findSubscriptionPlan(2)?.status).toBe('inactive'));
    expect((await findRow('Starter')).getByText('Inactive')).toBeInTheDocument();
  });

  it(
    'compares and bulk-activates selected plans',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage('/packages-plans?status=draft');
      await waitForRows(3);

      await user.click(screen.getByRole('checkbox', { name: 'Select Agency' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select Festive Offer' }));
      const bulk = screen.getByRole('region', { name: 'Bulk actions' });
      expect(within(bulk).getByText('2 selected')).toBeInTheDocument();

      await user.click(within(bulk).getByRole('button', { name: 'Compare' }));
      const compare = await screen.findByRole('dialog', { name: 'Compare 2 plans' });
      expect(within(compare).getByRole('columnheader', { name: 'Agency' })).toBeInTheDocument();
      expect(within(compare).getAllByLabelText('Included').length).toBeGreaterThan(0);
      await user.click(within(compare).getByRole('button', { name: 'Close' }));

      await user.click(within(bulk).getByRole('button', { name: 'Activate' }));
      const confirm = await screen.findByRole('dialog', { name: 'Activate plans' });
      await user.click(within(confirm).getByRole('button', { name: 'Activate' }));

      await waitFor(() => expect(messages()).toContain('2 plans activated.'));
      expect(mockDb.findSubscriptionPlan(10)?.status).toBe('active');
      expect(mockDb.findSubscriptionPlan(11)?.status).toBe('active');
      await waitForRows(1);
    },
    LONG_FLOW_MS,
  );

  it('hides actions the viewer may not use', async () => {
    signInAs(mockUsers.planViewer);
    renderPage();
    await waitForRows(PAGE);

    expect(screen.queryByRole('button', { name: 'Add new plan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actions for Gold' })).not.toBeInTheDocument();
  });

  it('shows a list error with a retry', async () => {
    signInAs(mockUsers.admin);
    let fail = true;
    server.use(
      http.get(apiPath('/admin/subscription-plans'), ({ request }) => {
        const size = new URL(request.url).searchParams.get('size');
        return fail && size !== '1'
          ? problem(500, 'server_error', 'Server unavailable.')
          : undefined;
      }),
    );
    const { user } = renderPage();

    expect(await screen.findByText('Server unavailable.')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitForRows(PAGE);
  });
});
