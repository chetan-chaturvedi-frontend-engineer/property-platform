import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';
import { STORAGE_KEYS } from '@/utils/constants';

import { FaqsPage } from './FaqsPage';

/**
 * 16 FAQs in display order 1…16: 13 published, 3 drafts (orders 8, 12, 15). #16 is in the removed
 * category "offers". See faqMockData.
 */
const TOTAL = 16;
const PAGE = 10;
const LONG_FLOW_MS = 30_000;

function renderPage(path = '/faqs') {
  window.localStorage.setItem(STORAGE_KEYS.faqsPageSize, JSON.stringify(PAGE));
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/faqs', element: <FaqsPage /> },
      { path: '/faqs/new', element: <p>Create form</p> },
      { path: '/faqs/:id/edit', element: <p>Edit form</p> },
    ],
    { initialPath: path, queryClient },
  );
}

const table = () => screen.getByRole('table', { name: 'FAQs' });

async function findRow(question: string) {
  const cell = await within(table()).findByText(question);
  const row = cell.closest('tr');
  if (!row) throw new Error('row not found');
  return within(row);
}

async function waitForRows(count: number) {
  await waitFor(() => expect(within(table()).getAllByRole('row')).toHaveLength(count + 1));
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);

describe('FaqsPage', () => {
  it('shows the overview cards and the first page in display order', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const stats = within(screen.getByRole('region', { name: 'FAQ statistics' }));
    expect(await stats.findByText(String(TOTAL))).toBeInTheDocument();
    expect(stats.getByText('13')).toBeInTheDocument();
    // Drafts and configured categories are both 3.
    expect(stats.getAllByText('3')).toHaveLength(2);

    await waitForRows(PAGE);
    expect(screen.getByText(`Showing 1 to ${PAGE} of ${TOTAL} entries`)).toBeInTheDocument();
    const rows = within(table()).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('How can I register as an individual seller?');

    const draft = await findRow('What are the charges for additional posts?');
    expect(draft.getByText('Draft')).toBeInTheDocument();
    expect(draft.getByText('Billing & Payments')).toBeInTheDocument();
    expect(draft.getByText('8')).toBeInTheDocument();
  });

  it('searches, filters by category and status, and pages through the results', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    await waitForRows(PAGE);

    // One input event, so a slow run cannot fire the debounce halfway through the word.
    await user.click(screen.getByRole('searchbox', { name: 'Search FAQs' }));
    await user.paste('password');
    await waitFor(() => expect(router.state.location.search).toContain('q=password'));
    await waitForRows(1);
    expect(await findRow('How do I reset my password?')).toBeTruthy();
    await user.clear(screen.getByRole('searchbox', { name: 'Search FAQs' }));
    await waitForRows(PAGE);

    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: 'Draft' }));
    await waitForRows(3);

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'General' }));
    await waitForRows(1);
    expect(await findRow('Is my phone number shown to buyers?')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    await waitForRows(PAGE);
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitForRows(TOTAL - PAGE);
    expect(router.state.location.search).toContain('page=1');
    expect(screen.getByText(`Showing 11 to ${TOTAL} of ${TOTAL} entries`)).toBeInTheDocument();
  });

  it('shows a no-results state with a way to clear the search', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/faqs?q=nothing-matches-this');

    expect(await screen.findByText('No matching FAQs')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitForRows(PAGE);
  });

  it('sorts by a column header through the API', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    await waitForRows(PAGE);

    await user.click(within(table()).getByRole('button', { name: 'Order' }));
    await waitFor(() => expect(router.state.location.search).toContain('dir=desc'));
    await waitFor(() =>
      expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('Old offer terms'),
    );
  });

  it('expands a row to show the full answer and flags a removed category', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/faqs?page=1');
    await waitForRows(TOTAL - PAGE);

    const orphan = await findRow('Old offer terms (archived)');
    expect(orphan.getByText('Removed category')).toBeInTheDocument();

    const first = await findRow('How do I upload property photos?');
    const toggle = first.getByRole('button', {
      name: 'Details of How do I upload property photos?',
    });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const answer = await screen.findByRole('article', { name: 'FAQ answer' });
    expect(answer).toHaveTextContent('Answer to: How do I upload property photos?');

    await user.click(toggle);
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'FAQ answer' })).not.toBeInTheDocument(),
    );
  });

  it('views a FAQ read-only in a dialog', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    const row = await findRow('How can I register as an individual seller?');

    await user.click(
      row.getByRole('button', { name: 'View How can I register as an individual seller?' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'FAQ details' });
    expect(await within(dialog).findByText(/Verify your phone number/)).toBeInTheDocument();
    expect(within(dialog).getByText('Display order')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Edit' }));
    expect(router.state.location.pathname).toBe('/faqs/1/edit');
  });

  it('unpublishes a FAQ from the row menu', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const row = await findRow('How can I register as a builder or dealer?');

    await user.click(
      row.getByRole('button', { name: 'Actions for How can I register as a builder or dealer?' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Unpublish' }));
    const dialog = await screen.findByRole('dialog', { name: 'Unpublish FAQ' });
    await user.click(within(dialog).getByRole('button', { name: 'Unpublish' }));

    await waitFor(() => expect(mockDb.findFaq(5)?.status).toBe('draft'));
    expect(messages()).toContain('FAQ status updated.');
    const stats = within(screen.getByRole('region', { name: 'FAQ statistics' }));
    expect(await stats.findByText('12')).toBeInTheDocument();
  });

  it(
    'deletes a FAQ permanently after confirming with its question',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage();
      const row = await findRow('How can I register as a builder or dealer?');

      await user.click(
        row.getByRole('button', { name: 'Actions for How can I register as a builder or dealer?' }),
      );
      await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
      const dialog = await screen.findByRole('dialog', { name: 'Delete FAQ' });
      expect(
        within(dialog).getByText('“How can I register as a builder or dealer?”'),
      ).toBeInTheDocument();
      expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Delete permanently' }));

      await waitFor(() => expect(mockDb.findFaq(5)).toBeUndefined());
      expect(messages()).toContain('FAQ deleted.');
      expect(
        await screen.findByText(`Showing 1 to ${PAGE} of ${TOTAL - 1} entries`),
      ).toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );

  it(
    'publishes and deletes selected FAQs in bulk',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage('/faqs?status=draft');
      await waitForRows(3);

      await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
      const bar = within(screen.getByRole('region', { name: 'Bulk actions' }));
      expect(bar.getByText('3 selected')).toBeInTheDocument();
      await user.click(bar.getByRole('button', { name: 'Publish' }));
      const dialog = await screen.findByRole('dialog', { name: 'Publish 3 FAQs' });
      await user.click(within(dialog).getByRole('button', { name: 'Publish' }));

      await waitFor(() => expect(messages()).toContain('3 FAQs published.'));
      expect(mockDb.faqs().every((faq) => faq.status === 'publish')).toBe(true);
      expect(await screen.findByText('No matching FAQs')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Clear filters' }));
      await waitForRows(PAGE);
      await user.click(
        screen.getByRole('checkbox', { name: 'Select How can I register as a builder or dealer?' }),
      );
      await user.click(
        screen.getByRole('checkbox', { name: 'Select How do I reset my password?' }),
      );
      await user.click(
        within(screen.getByRole('region', { name: 'Bulk actions' })).getByRole('button', {
          name: 'Delete',
        }),
      );
      const confirm = await screen.findByRole('dialog', { name: 'Delete 2 FAQs' });
      await user.click(within(confirm).getByRole('button', { name: 'Delete 2 FAQs' }));
      await waitFor(() => expect(messages()).toContain('2 FAQs deleted.'));
      expect(mockDb.faqs()).toHaveLength(TOTAL - 2);
    },
    LONG_FLOW_MS,
  );

  it('hides publish and delete actions the role does not grant', async () => {
    signInAs(mockUsers.faqEditor);
    const { user } = renderPage();
    const row = await findRow('How can I register as a builder or dealer?');

    expect(screen.getByRole('button', { name: 'Add new FAQ' })).toBeInTheDocument();
    expect(
      row.getByRole('button', { name: 'Edit How can I register as a builder or dealer?' }),
    ).toBeInTheDocument();
    // No status or delete permission: no selection and no such menu items.
    expect(screen.queryByRole('checkbox', { name: 'Select all rows on this page' })).toBeNull();
    await user.click(
      row.getByRole('button', { name: 'Actions for How can I register as a builder or dealer?' }),
    );
    expect(await screen.findByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Unpublish' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).toBeNull();
  });

  it('shows an error with retry when the list fails to load', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.get(apiPath('/admin/faqs'), () => problem(500, 'internal_error', 'Server exploded.'), {
        once: true,
      }),
    );
    const { user } = renderPage();

    // The counts and the list both start; whichever got the failure shows its retry.
    const retry = await screen.findAllByRole('button', { name: /Try again|Retry/ });
    await user.click(retry[0] ?? screen.getByRole('button'));
    await waitFor(() =>
      expect(screen.queryAllByRole('button', { name: /Try again|Retry/ })).toHaveLength(0),
    );
  });
});
