import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';
import { STORAGE_KEYS } from '@/utils/constants';

import { ContentPagesPage } from './ContentPagesPage';

/**
 * 12 pages, newest first in seed order: 9 published, 3 drafts (Refund…, Careers, Upcoming launch),
 * 4 system pages. See contentPageMockData.
 */
const TOTAL = 12;
const PAGE = 10;
const LONG_FLOW_MS = 30_000;

function renderPage(path = '/pages') {
  window.localStorage.setItem(STORAGE_KEYS.contentPagesPageSize, JSON.stringify(PAGE));
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/pages', element: <ContentPagesPage /> },
      { path: '/pages/new', element: <p>Create form</p> },
      { path: '/pages/:id/edit', element: <p>Edit form</p> },
    ],
    { initialPath: path, queryClient },
  );
}

const table = () => screen.getByRole('table', { name: 'Pages' });

async function findRow(heading: string) {
  const cell = await within(table()).findByText(heading);
  const row = cell.closest('tr');
  if (!row) throw new Error('row not found');
  return within(row);
}

async function waitForRows(count: number) {
  await waitFor(() => expect(within(table()).getAllByRole('row')).toHaveLength(count + 1));
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);

describe('ContentPagesPage', () => {
  it('shows the overview cards and the first page, newest first', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const stats = within(screen.getByRole('region', { name: 'Page statistics' }));
    expect(await stats.findByText(String(TOTAL))).toBeInTheDocument();
    expect(stats.getByText('9')).toBeInTheDocument();
    expect(stats.getByText('3')).toBeInTheDocument();
    expect(stats.getByText('4')).toBeInTheDocument();

    await waitForRows(PAGE);
    expect(screen.getByText(`Showing 1 to ${PAGE} of ${TOTAL} entries`)).toBeInTheDocument();
    expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('About us');

    const refund = await findRow('Refund and cancellation policy');
    expect(refund.getByText('/refund-policy')).toBeInTheDocument();
    expect(refund.getByText('System page')).toBeInTheDocument();
    expect(refund.getByText('Draft')).toBeInTheDocument();
  });

  it(
    'searches, filters by status and type, sorts and pages through the results',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage();
      await waitForRows(PAGE);

      await user.click(screen.getByRole('button', { name: /Next page|Go to next page/ }));
      await waitForRows(TOTAL - PAGE);

      await user.click(screen.getByRole('searchbox', { name: 'Search pages' }));
      await user.paste('policy');
      await waitFor(() => expect(router.state.location.search).toBe('?q=policy'));
      await waitForRows(2);

      await user.click(screen.getByRole('combobox', { name: 'Status' }));
      await user.click(await screen.findByRole('option', { name: 'Draft' }));
      await waitForRows(1);
      expect(within(table()).getByText('Refund and cancellation policy')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Clear/ }));
      await waitForRows(PAGE);

      await user.click(screen.getByRole('combobox', { name: 'Type' }));
      await user.click(await screen.findByRole('option', { name: 'System page' }));
      await waitForRows(4);

      await user.click(screen.getByRole('button', { name: /Page title/ }));
      await waitFor(() =>
        expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('Privacy policy'),
      );
      expect(router.state.location.search).toContain('sort=heading');
    },
    LONG_FLOW_MS,
  );

  it('applies filters from the side panel', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    await waitForRows(PAGE);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    const panel = within(await screen.findByRole('region', { name: 'Page filters' }));
    await user.click(panel.getByRole('combobox', { name: 'Type' }));
    await user.click(await screen.findByRole('option', { name: 'Static page' }));
    await user.click(panel.getByRole('combobox', { name: 'Sort by' }));
    await user.click(await screen.findByRole('option', { name: 'Title (A–Z)' }));
    await user.click(panel.getByRole('button', { name: 'Apply filters' }));

    await waitForRows(8);
    expect(router.state.location.search).toContain('type=static');
    expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('About us');
  });

  it('shows details with SEO fields and content in the view dialog', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();

    const row = await findRow('Privacy policy');
    await user.click(row.getByRole('button', { name: 'View Privacy policy' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Page details' }));
    expect(await dialog.findByText('/pages/privacy-policy')).toBeInTheDocument();
    expect(dialog.getByText('What we collect and why.')).toBeInTheDocument();
    expect(dialog.getByText('data protection')).toBeInTheDocument();
    expect(dialog.getByText('How we handle your data')).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Edit' }));
    expect(router.state.location.pathname).toBe('/pages/3/edit');
  });

  it(
    'unpublishes a page and warns before deleting a system page',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();

      const about = await findRow('About us');
      await user.click(about.getByRole('button', { name: 'Actions for About us' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Unpublish' }));
      const confirm = within(await screen.findByRole('dialog', { name: 'Unpublish page' }));
      await user.click(confirm.getByRole('button', { name: 'Unpublish' }));
      await waitFor(() => expect(mockDb.findContentPage(1)?.status).toBe('draft'));
      expect(messages()).toContain('Page status updated.');

      const terms = await findRow('Terms and conditions');
      await user.click(terms.getByRole('button', { name: 'Actions for Terms and conditions' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
      const dialog = within(await screen.findByRole('dialog', { name: 'Delete page' }));
      expect(dialog.getByText(/This is a system page/)).toBeInTheDocument();
      await user.click(dialog.getByRole('button', { name: 'Delete permanently' }));
      await waitFor(() => expect(mockDb.findContentPage(2)).toBeUndefined());
      expect(messages()).toContain('Page deleted.');
    },
    LONG_FLOW_MS,
  );

  it(
    'publishes selected pages in bulk',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage('/pages?status=draft');
      await waitForRows(3);

      await user.click(within(table()).getByRole('checkbox', { name: /Select all/i }));
      await user.click(screen.getByRole('button', { name: 'Publish' }));
      const dialog = within(await screen.findByRole('dialog', { name: 'Publish 3 pages' }));
      await user.click(dialog.getByRole('button', { name: 'Publish' }));

      await waitFor(() => expect(messages()).toContain('3 pages published.'));
      expect(mockDb.contentPages().filter((page) => page.status === 'draft')).toHaveLength(0);
    },
    LONG_FLOW_MS,
  );

  it('hides write actions without permission', async () => {
    signInAs(mockUsers.pageEditor);
    const { user } = renderPage();

    const row = await findRow('About us');
    expect(row.getByRole('button', { name: 'Edit About us' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Select all/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add new page/ })).toBeInTheDocument();
    await user.click(row.getByRole('button', { name: 'Actions for About us' }));
    expect(screen.queryByRole('menuitem', { name: 'Unpublish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('shows an error with retry when the list fails', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.get(apiPath('/admin/pages'), () => problem(500, 'internal_error', 'Server error.')),
    );
    renderPage();
    expect(await screen.findByText(/Could not load page statistics/)).toBeInTheDocument();
    expect(await screen.findAllByRole('button', { name: /Retry/ })).not.toHaveLength(0);
  });
});
