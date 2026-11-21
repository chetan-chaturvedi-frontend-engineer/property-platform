import { screen, waitFor, within } from '@testing-library/react';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';

import { BlogDetailsPage } from './BlogDetailsPage';

function renderPage(path: string) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/blogs', element: <p>Blog list</p> },
      { path: '/blogs/new', element: <p>Create form</p> },
      { path: '/blogs/:id', element: <BlogDetailsPage /> },
      { path: '/blogs/:id/edit', element: <p>Edit form</p> },
    ],
    { initialPath: path, queryClient },
  );
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);

describe('BlogDetailsPage', () => {
  it('shows the stored article, its facts and SEO with fallbacks', async () => {
    signInAs(mockUsers.admin);
    renderPage('/blogs/1');

    // The page title and the content's own first heading.
    expect(
      await screen.findAllByRole('heading', { name: 'Top 10 Tips for First-Time Home Buyers' }),
    ).toHaveLength(2);
    const article = screen.getByRole('article', { name: 'Blog content' });
    expect(within(article).getByText('Plan your budget')).toBeInTheDocument();
    expect(within(article).getByText('Research first, decide later.')).toBeInTheDocument();

    const info = within(screen.getByLabelText('Blog information'));
    expect(info.getByText('#1')).toBeInTheDocument();
    expect(info.getByText('top-10-tips-for-first-time-home-buyers')).toBeInTheDocument();
    expect(info.getByText('home buying')).toBeInTheDocument();

    const seo = within(screen.getByRole('region', { name: 'SEO & meta details' }));
    expect(seo.getByText('Top 10 Tips for First-Time Home Buyers | Dwellery')).toBeInTheDocument();
    expect(seo.getByText('Not set: the short description is used.')).toBeInTheDocument();
    expect(seo.getByText('/blog/top-10-tips-for-first-time-home-buyers')).toBeInTheDocument();
  });

  it('explains why a published blog in an inactive category is hidden', async () => {
    signInAs(mockUsers.admin);
    renderPage('/blogs/14');
    expect(await screen.findByText(/Activate the "Archived News" category/)).toBeInTheDocument();
    expect(screen.getAllByText('Hidden').length).toBeGreaterThan(0);
  });

  it('unpublishes from the actions card', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/blogs/2');
    const actions = within(await screen.findByRole('region', { name: 'Blog actions' }));

    await user.click(actions.getByRole('button', { name: 'Unpublish' }));
    const dialog = await screen.findByRole('dialog', { name: 'Unpublish blog' });
    await user.click(within(dialog).getByRole('button', { name: 'Unpublish' }));

    await waitFor(() => expect(mockDb.findBlog(2)?.status).toBe('draft'));
    expect(messages()).toContain('Blog status updated.');
    expect(await actions.findByRole('button', { name: 'Publish now' })).toBeInTheDocument();
  });

  it('deletes and returns to the list', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage('/blogs/3');
    const actions = within(await screen.findByRole('region', { name: 'Blog actions' }));

    await user.click(actions.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete blog' });
    expect(within(dialog).getByText('How to Decorate Your New Home')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/blogs'));
    expect(mockDb.findBlog(3)).toBeUndefined();
  });

  it('opens the full preview with device frames', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/blogs/1');
    const view = within(await screen.findByRole('region', { name: 'Blog' }));
    await user.click(view.getByRole('button', { name: 'Preview' }));
    const dialog = await screen.findByRole('dialog', { name: /Blog preview/ });
    await user.click(within(dialog).getByRole('button', { name: 'Mobile preview' }));
    expect(within(dialog).getByRole('figure', { name: 'Mobile preview' })).toBeInTheDocument();
  });

  it('hides write actions from a read-only user', async () => {
    signInAs(mockUsers.blogViewer);
    renderPage('/blogs/1');
    const actions = within(await screen.findByRole('region', { name: 'Blog actions' }));
    expect(actions.getByRole('button', { name: 'Preview' })).toBeInTheDocument();
    expect(actions.queryByRole('button', { name: 'Edit blog' })).not.toBeInTheDocument();
    expect(actions.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add new blog' })).not.toBeInTheDocument();
  });

  it('reports a missing blog', async () => {
    signInAs(mockUsers.admin);
    renderPage('/blogs/999');
    expect(await screen.findByText('This blog does not exist or was deleted.')).toBeInTheDocument();
  });
});
