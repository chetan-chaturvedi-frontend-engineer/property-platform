import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';
import { STORAGE_KEYS } from '@/utils/constants';

import { BlogsPage } from './BlogsPage';

/**
 * 14 blogs, newest first (id 14 … 1). Live: 1-7 and 13; hidden by an inactive category: 14;
 * scheduled: 8, 9; drafts: 10, 11, 12 (12 without category). See blogMockData.
 */
const TOTAL = 14;
const PAGE = 10;
const LONG_FLOW_MS = 30_000;

function renderPage(path = '/blogs') {
  window.localStorage.setItem(STORAGE_KEYS.blogsPageSize, JSON.stringify(PAGE));
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/blogs', element: <BlogsPage /> },
      { path: '/blogs/new', element: <p>Create form</p> },
      { path: '/blogs/:id', element: <p>Details page</p> },
      { path: '/blogs/:id/edit', element: <p>Edit form</p> },
    ],
    { initialPath: path, queryClient },
  );
}

const table = () => screen.getByRole('table', { name: 'Blogs' });

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

describe('BlogsPage', () => {
  it('shows the overview cards, tab counts and the first page', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const stats = within(screen.getByRole('region', { name: 'Blog statistics' }));
    expect(await stats.findByText(String(TOTAL))).toBeInTheDocument();
    // Published (live or hidden by the category) 9, drafts 3, scheduled 2.
    expect(stats.getByText('9')).toBeInTheDocument();
    expect(stats.getByText('3')).toBeInTheDocument();
    expect(stats.getByText('2')).toBeInTheDocument();

    const tabs = within(screen.getByRole('tablist', { name: 'Blog status' }));
    expect(tabs.getByRole('tab', { name: /All blogs\s*14/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(tabs.getByRole('tab', { name: /Drafts\s*3/ })).toBeInTheDocument();

    await waitForRows(PAGE);
    expect(screen.getByText(`Showing 1 to ${PAGE} of ${TOTAL} entries`)).toBeInTheDocument();

    const hidden = await findRow('Old Price Index Notes');
    expect(hidden.getByText('Hidden')).toBeInTheDocument();
    expect(hidden.getByText('Archived News')).toBeInTheDocument();

    const draft = await findRow('Untitled market idea');
    expect(draft.getByText('Draft')).toBeInTheDocument();
    expect(draft.getByText('No category')).toBeInTheDocument();
    expect(draft.getByText('Not published')).toBeInTheDocument();

    const scheduled = await findRow('Upcoming Metro Lines and Property Prices');
    expect(scheduled.getByText('Scheduled')).toBeInTheDocument();
    expect(scheduled.getByText('Goes live automatically')).toBeInTheDocument();
  });

  it(
    'filters by tab, category and search, sorts and pages',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage();
      await waitForRows(PAGE);

      await user.click(screen.getByRole('button', { name: 'Go to next page' }));
      await waitForRows(TOTAL - PAGE);
      expect(router.state.location.search).toContain('page=1');

      await user.click(screen.getByRole('tab', { name: /Scheduled/ }));
      await waitForRows(2);
      expect(router.state.location.search).toBe('?tab=scheduled');

      await user.click(screen.getByRole('tab', { name: /Published/ }));
      await waitForRows(9);

      await user.click(screen.getByRole('combobox', { name: 'Category' }));
      await user.click(await screen.findByRole('option', { name: 'Legal Guide' }));
      // Live legal blogs: 4, 7, 13.
      await waitForRows(3);

      await user.type(screen.getByRole('searchbox', { name: 'Search blogs' }), 'stamp');
      await waitForRows(1);
      expect(await findRow('Understanding Stamp Duty')).toBeTruthy();
      expect(router.state.location.search).toContain('q=stamp');

      await user.click(screen.getByRole('button', { name: 'Clear all' }));
      await waitForRows(PAGE);

      await user.click(screen.getByRole('button', { name: /^Blog/ }));
      await waitFor(() => expect(router.state.location.search).toContain('sort=title'));
      const firstRow = within(table()).getAllByRole('row')[1];
      expect(firstRow).toHaveTextContent('Benefits of Investing in Plot vs Apartment');
    },
    LONG_FLOW_MS,
  );

  it('filters by tag and published dates from the panel', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    await waitForRows(PAGE);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    const panel = within(await screen.findByRole('region', { name: 'Blog filters' }));
    await user.type(panel.getByRole('combobox', { name: 'Tag' }), 'Legal');
    await user.click(panel.getByRole('button', { name: 'Apply filters' }));

    // Tagged "legal": 4, 7, 13.
    await waitForRows(3);
    expect(router.state.location.search).toContain('tag=legal');
    const chip = await screen.findByText('Tag: legal');
    expect(chip).toBeInTheDocument();
  });

  it(
    'publishes and deletes selected blogs, skipping one without a category',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage('/blogs?tab=draft');
      await waitForRows(3);

      await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
      expect(screen.getByText('3 selected')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Publish' }));
      const dialog = within(await screen.findByRole('dialog', { name: 'Publish 3 blogs' }));
      expect(dialog.getByText(/1 blog without a category will be skipped/)).toBeInTheDocument();
      await user.click(dialog.getByRole('button', { name: 'Publish now' }));

      await waitFor(() => expect(messages()).toContain('2 blogs published.'));
      expect(mockDb.findBlog(10)?.status).toBe('publish');
      expect(mockDb.findBlog(12)?.status).toBe('draft');
      await waitForRows(1);

      await user.click(screen.getByRole('checkbox', { name: 'Select Untitled market idea' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      const confirm = within(await screen.findByRole('dialog', { name: 'Delete blog' }));
      await user.click(confirm.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(mockDb.findBlog(12)).toBeUndefined());
      expect(messages()).toContain('Blog deleted.');
    },
    LONG_FLOW_MS,
  );

  it('opens details, edit and duplicate from a row', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    const row = await findRow('Home Loan Guide 2026');

    await user.click(row.getByRole('button', { name: 'Actions for Home Loan Guide 2026' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Duplicate' }));
    expect(router.state.location.pathname).toBe('/blogs/new');
    expect(router.state.location.search).toBe('?from=6');
  });

  it('navigates to the details page with the view button', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage();
    const row = await findRow('Home Loan Guide 2026');
    await user.click(row.getByRole('button', { name: 'View Home Loan Guide 2026' }));
    expect(router.state.location.pathname).toBe('/blogs/6');
  });

  it('hides write actions and the category filter without permission', async () => {
    signInAs(mockUsers.blogViewer);
    const { user } = renderPage();
    const row = await findRow('Home Loan Guide 2026');
    expect(screen.queryByRole('button', { name: 'Add new blog' })).not.toBeInTheDocument();
    expect(row.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Category' })).not.toBeInTheDocument();

    await user.click(row.getByRole('button', { name: 'Actions for Home Loan Guide 2026' }));
    const menu = within(await screen.findByRole('menu'));
    expect(menu.getByRole('menuitem', { name: 'View details' })).toBeInTheDocument();
    expect(menu.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
    expect(menu.queryByRole('menuitem', { name: 'Unpublish' })).not.toBeInTheDocument();
  });

  it('shows an error with retry when the list fails', async () => {
    signInAs(mockUsers.admin);
    let failures = 1;
    server.use(
      http.get(apiPath('/admin/blogs'), ({ request }) => {
        const size = new URL(request.url).searchParams.get('size');
        if (size !== '1' && failures > 0) {
          failures -= 1;
          return problem(500, 'internal_error', 'Something went wrong.');
        }
        return undefined;
      }),
    );
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitForRows(PAGE);
  });
});
