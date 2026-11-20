import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';

import { BlogFormPage } from './BlogFormPage';

const LONG_FLOW_MS = 40_000;

function renderPage(path: string) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/blogs', element: <p>Blog list</p> },
      { path: '/blogs/new', element: <BlogFormPage /> },
      { path: '/blogs/:id', element: <p>Details page</p> },
      { path: '/blogs/:id/edit', element: <BlogFormPage /> },
    ],
    { initialPath: path, queryClient },
  );
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);
const editorBox = () => screen.getByRole('textbox', { name: 'Content' });

describe('BlogFormPage', () => {
  it(
    'creates and publishes a blog with tags and a generated slug',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage('/blogs/new');

      await user.type(
        await screen.findByRole('textbox', { name: 'Blog title' }),
        'Pune Rental Yields & Tips',
      );
      expect(screen.getByRole('textbox', { name: 'URL slug' })).toHaveValue(
        'pune-rental-yields-and-tips',
      );

      await user.click(screen.getByRole('combobox', { name: 'Category' }));
      await user.click(await screen.findByRole('option', { name: 'Market Trends' }));
      await user.type(
        screen.getByRole('textbox', { name: 'Short description' }),
        'Where renting pays.',
      );
      await user.click(editorBox());
      await user.keyboard('Rents rose in Baner.');

      const tags = screen.getByRole('combobox', { name: 'Tags' });
      await user.type(tags, 'Rental  Yield{Enter}pune,');
      expect(screen.getByRole('button', { name: 'rental yield' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'pune' })).toBeInTheDocument();

      // The live preview follows the form.
      const preview = within(screen.getByRole('region', { name: 'Preview' }));
      expect(preview.getByText('Pune Rental Yields & Tips')).toBeInTheDocument();
      expect(preview.getByText('Market Trends')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Publish blog' }));

      await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/blogs\/\d+$/));
      const created = mockDb.blogs().find((blog) => blog.title === 'Pune Rental Yields & Tips');
      expect(created).toMatchObject({
        slug: 'pune-rental-yields-and-tips',
        status: 'publish',
        categoryId: 2,
        shortDescription: 'Where renting pays.',
        tags: ['rental yield', 'pune'],
      });
      expect(created?.content).toContain('Rents rose in Baner.');
      expect(created?.publishedAt).not.toBeNull();
      expect(messages()).toContain('Blog published.');
    },
    LONG_FLOW_MS,
  );

  it(
    'saves a draft without a category but requires one to publish',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage('/blogs/new');

      await user.click(await screen.findByRole('button', { name: 'Publish blog' }));
      expect(await screen.findByText('Enter the blog title')).toBeInTheDocument();
      expect(screen.getByText('Write the blog content')).toBeInTheDocument();
      expect(screen.getByText('Select a category to publish')).toBeInTheDocument();

      await user.type(screen.getByRole('textbox', { name: 'Blog title' }), 'Idea list');
      await user.click(editorBox());
      await user.keyboard('Notes.');
      await user.click(screen.getByRole('button', { name: 'Save as draft' }));

      await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/blogs\/\d+$/));
      expect(mockDb.blogs().find((blog) => blog.title === 'Idea list')).toMatchObject({
        status: 'draft',
        categoryId: null,
        publishedAt: null,
      });
      expect(messages()).toContain('Draft saved.');
    },
    LONG_FLOW_MS,
  );

  it(
    'schedules a blog and rejects a time in the past',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage('/blogs/new');

      await user.type(await screen.findByRole('textbox', { name: 'Blog title' }), 'Later post');
      await user.click(screen.getByRole('combobox', { name: 'Category' }));
      await user.click(await screen.findByRole('option', { name: 'Buying Tips' }));
      await user.click(editorBox());
      await user.keyboard('Soon.');
      await user.click(screen.getByRole('radio', { name: 'Schedule for later' }));

      const when = screen.getByLabelText('Publish date & time');
      await user.clear(when);
      await user.type(when, '2020-01-01T09:00');
      await user.click(screen.getByRole('button', { name: 'Schedule blog' }));
      expect(
        await screen.findByText('Choose a time in the future, or publish immediately'),
      ).toBeInTheDocument();

      await user.clear(when);
      await user.type(when, '2099-03-01T09:30');
      await user.click(screen.getByRole('button', { name: 'Schedule blog' }));

      await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/blogs\/\d+$/));
      const created = mockDb.blogs().find((blog) => blog.title === 'Later post');
      expect(created?.status).toBe('publish');
      expect(created?.publishedAt).toBe(new Date('2099-03-01T09:30').toISOString());
      expect(messages()).toContain('Blog scheduled.');
    },
    LONG_FLOW_MS,
  );

  it(
    'edits only what changed and keeps the publication date',
    async () => {
      signInAs(mockUsers.admin);
      const bodies: unknown[] = [];
      server.events.on('request:start', ({ request }) => {
        if (request.method === 'PATCH')
          void request
            .clone()
            .json()
            .then((body) => bodies.push(body));
      });
      const before = mockDb.findBlog(6);
      const { user, router } = renderPage('/blogs/6/edit');

      const title = await screen.findByRole('textbox', { name: 'Blog title' });
      expect(title).toHaveValue('Home Loan Guide 2026');
      expect(screen.getByRole('textbox', { name: 'URL slug' })).toHaveValue('home-loan-guide-2026');
      expect(await screen.findByText('Plan your budget')).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: /Keep the current publication date/ }),
      ).toBeChecked();

      await user.clear(title);
      await user.type(title, 'Home Loan Guide 2027');
      await user.click(screen.getByRole('button', { name: 'Update blog' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/blogs/6'));
      expect(bodies).toEqual([{ title: 'Home Loan Guide 2027' }]);
      expect(mockDb.findBlog(6)?.publishedAt).toBe(before?.publishedAt);
      expect(mockDb.findBlog(6)?.slug).toBe('home-loan-guide-2026');
      expect(messages()).toContain('Blog updated.');
      server.events.removeAllListeners();
    },
    LONG_FLOW_MS,
  );

  it('warns before changing the URL of a published blog and reports a taken slug', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/blogs/6/edit');
    const slug = await screen.findByRole('textbox', { name: 'URL slug' });

    await user.clear(slug);
    await user.type(slug, 'rera-explained');
    expect(screen.getByText(/Changing its URL breaks existing links/)).toBeInTheDocument();
    expect(
      await screen.findByText('Already used by "RERA Explained". Choose another slug.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Update blog' }));
    expect(await screen.findByText('Another blog already uses this slug.')).toBeInTheDocument();
  });

  it('unpublishes a published blog from the editor', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage('/blogs/2/edit');
    await user.click(await screen.findByRole('button', { name: 'Unpublish & save draft' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/blogs/2'));
    expect(mockDb.findBlog(2)?.status).toBe('draft');
  });

  it('shows server field errors next to the fields', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.post(apiPath('/admin/blogs'), () =>
        problem(400, 'validation_failed', 'Validation failed', {
          errors: { 'tags[0]': 'must be 1-50 letters', content: 'must contain text or an image' },
        }),
      ),
    );
    const { user } = renderPage('/blogs/new');
    await user.type(await screen.findByRole('textbox', { name: 'Blog title' }), 'Bad tags');
    await user.click(editorBox());
    await user.keyboard('Body');
    await user.click(screen.getByRole('button', { name: 'Save as draft' }));

    expect(await screen.findByText('Must be 1-50 letters')).toBeInTheDocument();
    expect(screen.getByText('Must contain text or an image')).toBeInTheDocument();
  });

  it(
    'duplicates a blog as a new draft with its own slug and image',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage('/blogs/new?from=1');

      expect(
        await screen.findByText(/Copied from "Top 10 Tips for First-Time Home Buyers"/),
      ).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Blog title' })).toHaveValue(
        'Copy of Top 10 Tips for First-Time Home Buyers',
      );
      await user.click(screen.getByRole('button', { name: 'Save as draft' }));

      await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/blogs\/\d+$/));
      const copy = mockDb.blogs().find((blog) => blog.title.startsWith('Copy of Top 10'));
      expect(copy).toMatchObject({
        status: 'draft',
        slug: 'copy-of-top-10-tips-for-first-time-home-buyers',
        categoryId: 1,
        tags: ['home buying', 'tips'],
      });
      expect(copy?.imageFile).not.toBeNull();
      expect(messages()).toContain('Blog duplicated.');
    },
    LONG_FLOW_MS,
  );

  it('creates a category from the form and selects it', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/blogs/new');
    await user.click(await screen.findByRole('button', { name: 'New category' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New blog category' }));
    await user.type(dialog.getByRole('textbox', { name: 'Category title' }), 'NRI Corner');
    await user.click(dialog.getByRole('button', { name: 'Create category' }));

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('NRI Corner'),
    );
    expect(mockDb.blogCategories().some((category) => category.slug === 'nri-corner')).toBe(true);
  });

  it('works without category permissions, keeping the saved category', async () => {
    signInAs(mockUsers.blogWriter);
    renderPage('/blogs/1/edit');
    const category = await screen.findByRole('combobox', { name: 'Category' });
    expect(category).toHaveValue('Buying Tips');
    expect(
      screen.getByText('Categories are not listed (no permission to view categories).'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New category' })).not.toBeInTheDocument();
  });

  it('asks before leaving with unsaved changes', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderPage('/blogs/new');
    await user.type(await screen.findByRole('textbox', { name: 'Blog title' }), 'Draft');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Discard changes?' }));
    await user.click(dialog.getByRole('button', { name: 'Keep editing' }));
    expect(router.state.location.pathname).toBe('/blogs/new');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Discard changes?' })).getByRole('button', {
        name: 'Discard',
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/blogs'));
  });

  it('reports a blog that does not exist', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.get(apiPath('/admin/blogs/:id'), () =>
        HttpResponse.json(
          { status: 404, code: 'blog_not_found', detail: 'Blog not found.' },
          { status: 404 },
        ),
      ),
    );
    renderPage('/blogs/77/edit');
    expect(await screen.findByText('This blog does not exist or was deleted.')).toBeInTheDocument();
  });
});
