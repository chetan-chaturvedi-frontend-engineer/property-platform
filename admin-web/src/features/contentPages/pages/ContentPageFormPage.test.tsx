import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';

import { ContentPageFormPage } from './ContentPageFormPage';

const LONG_FLOW_MS = 40_000;

function renderPage(path: string) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/pages', element: <p>Page list</p> },
      { path: '/pages/new', element: <ContentPageFormPage /> },
      { path: '/pages/:id/edit', element: <ContentPageFormPage /> },
    ],
    { initialPath: path, queryClient },
  );
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);
const contentBox = () => screen.getByRole('textbox', { name: 'Page content' });
const titleBox = () => screen.getByRole('textbox', { name: /Page title/ });

describe('ContentPageFormPage', () => {
  it(
    'creates a published system page with a generated slug and SEO fields',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage('/pages/new');

      await user.type(await screen.findByRole('textbox', { name: /Page title/ }), 'Cookie policy');
      expect(screen.getByRole('textbox', { name: 'URL slug' })).toHaveValue('cookie-policy');
      await user.click(contentBox());
      await user.keyboard('We use cookies.');
      await user.click(screen.getByRole('combobox', { name: /Page type/ }));
      await user.click(await screen.findByRole('option', { name: 'System page' }));
      await user.click(screen.getByRole('combobox', { name: /Status/ }));
      await user.click(await screen.findByRole('option', { name: 'Published' }));
      await user.type(screen.getByRole('textbox', { name: /Meta keywords/ }), 'cookies, privacy');

      const preview = within(screen.getByRole('group', { name: 'Search result preview' }));
      expect(preview.getByText('Website › pages › cookie-policy')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Save page' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/pages'));
      const created = mockDb.contentPages().find((page) => page.heading === 'Cookie policy');
      expect(created).toMatchObject({
        slug: 'cookie-policy',
        type: 'system',
        status: 'publish',
        metaKeywords: 'cookies, privacy',
        metaTitle: null,
      });
      expect(created?.content).toContain('We use cookies.');
      expect(messages()).toContain('Page published.');
    },
    LONG_FLOW_MS,
  );

  it('validates the required fields before sending anything', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/pages/new');
    const before = mockDb.contentPages().length;

    await user.click(await screen.findByRole('button', { name: 'Save as draft' }));

    expect(await screen.findByText('Enter the page title')).toBeInTheDocument();
    expect(screen.getByText('Write the page content')).toBeInTheDocument();
    expect(screen.getByText('Check the highlighted fields.')).toBeInTheDocument();
    expect(mockDb.contentPages()).toHaveLength(before);
  });

  it(
    'flags a taken slug and shows the server conflict on the field',
    async () => {
      signInAs(mockUsers.admin);
      const { user } = renderPage('/pages/new');

      await user.type(await screen.findByRole('textbox', { name: /Page title/ }), 'Careers');
      expect(
        await screen.findByText(/Already used by "Careers"; a number will be added/),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Edit slug' }));
      const slug = screen.getByRole('textbox', { name: /URL slug/ });
      expect(slug).toHaveValue('careers');
      expect(
        await screen.findByText('Already used by "Careers". Choose another slug.'),
      ).toBeInTheDocument();

      await user.click(contentBox());
      await user.keyboard('Join us.');
      await user.click(screen.getByRole('button', { name: 'Save as draft' }));
      expect(await screen.findByText('Another page already uses this slug.')).toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );

  it(
    'edits a page and sends only the changed fields',
    async () => {
      signInAs(mockUsers.admin);
      let body: unknown;
      server.events.on('request:start', ({ request }) => {
        if (request.method !== 'PATCH') return;
        void request
          .clone()
          .json()
          .then((json: unknown) => {
            body = json;
          });
      });
      const { user, router } = renderPage('/pages/3/edit');

      await waitFor(() => expect(titleBox()).toHaveValue('Privacy policy'));
      expect(screen.getByRole('textbox', { name: /Meta title/ })).toHaveValue(
        'Privacy policy | PropertyPro',
      );
      await user.clear(screen.getByRole('textbox', { name: /Meta title/ }));
      await user.clear(screen.getByRole('textbox', { name: /URL slug/ }));
      await user.type(screen.getByRole('textbox', { name: /URL slug/ }), 'privacy');
      expect(
        screen.getByText(/This page is published. Changing its URL breaks/),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Save page' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/pages'));
      server.events.removeAllListeners();
      expect(body).toEqual({ slug: 'privacy', metaTitle: null });
      expect(mockDb.findContentPage(3)).toMatchObject({ slug: 'privacy', metaTitle: null });
      expect(messages()).toContain('Page updated.');
    },
    LONG_FLOW_MS,
  );

  it('opens a preview of the unsaved page', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/pages/1/edit');

    await waitFor(() => expect(titleBox()).toHaveValue('About us'));
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Page preview' }));
    // The page title, plus the h2 the seeded content starts with.
    expect(dialog.getAllByRole('heading', { name: 'About us' })).toHaveLength(2);
    expect(dialog.getByText('Who we are')).toBeInTheDocument();
  });

  it('keeps the status locked without the publish permission', async () => {
    signInAs(mockUsers.pageEditor);
    renderPage('/pages/new');

    expect(await screen.findByRole('button', { name: 'Save as draft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save page' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Changing the status needs the page publish permission.'),
    ).toBeInTheDocument();
  });

  it('reports a missing page', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.get(apiPath('/admin/pages/:id'), () =>
        HttpResponse.json(
          { status: 404, code: 'page_not_found', detail: 'Page not found.' },
          { status: 404 },
        ),
      ),
    );
    renderPage('/pages/999/edit');
    expect(await screen.findByText('This page does not exist or was deleted.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to pages' })).toBeInTheDocument();
  });
});
