import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';

import { FaqFormPage } from './FaqFormPage';

const LONG_FLOW_MS = 40_000;

function renderPage(path: string) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/faqs', element: <p>FAQ list</p> },
      { path: '/faqs/new', element: <FaqFormPage /> },
      { path: '/faqs/:id/edit', element: <FaqFormPage /> },
    ],
    { initialPath: path, queryClient },
  );
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);
const answerBox = () => screen.getByRole('textbox', { name: 'Answer' });
const questionBox = () => screen.getByRole('textbox', { name: /Question/ });

describe('FaqFormPage', () => {
  it(
    'creates a published FAQ with the suggested display order',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage('/faqs/new');

      await user.type(
        await screen.findByRole('textbox', { name: /Question/ }),
        'Can I edit a listing?',
      );
      // One after the highest saved order (16).
      expect(screen.getByRole('spinbutton', { name: 'Display order' })).toHaveValue(17);

      await user.click(answerBox());
      await user.keyboard('Yes, from My listings.');
      await user.click(screen.getByRole('combobox', { name: /Category/ }));
      await user.click(await screen.findByRole('option', { name: 'Technical Support' }));
      await user.click(screen.getByRole('combobox', { name: /Status/ }));
      await user.click(await screen.findByRole('option', { name: 'Published' }));

      // The preview follows the form.
      const preview = within(screen.getByRole('region', { name: 'Preview' }));
      expect(preview.getByText('Can I edit a listing?')).toBeInTheDocument();
      expect(answerBox()).toHaveTextContent('Yes, from My listings.');

      await user.click(screen.getByRole('button', { name: 'Save FAQ' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/faqs'));
      const created = mockDb.faqs().find((faq) => faq.question === 'Can I edit a listing?');
      expect(created).toMatchObject({ category: 'technical', status: 'publish', sortOrder: 17 });
      expect(created?.answer).toContain('Yes, from My listings.');
      expect(messages()).toContain('FAQ published.');
    },
    LONG_FLOW_MS,
  );

  it('validates the required fields before sending anything', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/faqs/new');
    const before = mockDb.faqs().length;

    await user.click(await screen.findByRole('button', { name: 'Save as draft' }));

    expect(await screen.findByText('Enter the question')).toBeInTheDocument();
    expect(screen.getByText('Write the answer')).toBeInTheDocument();
    expect(screen.getByText('Select a category')).toBeInTheDocument();
    expect(screen.getByText('Check the highlighted fields.')).toBeInTheDocument();

    await user.clear(screen.getByRole('spinbutton', { name: 'Display order' }));
    await user.click(screen.getByRole('button', { name: 'Save as draft' }));
    expect(await screen.findByText('Enter a whole number (0 or more)')).toBeInTheDocument();
    expect(mockDb.faqs()).toHaveLength(before);
  });

  it(
    'saves as a draft even when Published is selected',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage('/faqs/new');

      await user.type(await screen.findByRole('textbox', { name: /Question/ }), 'Draft question?');
      await user.click(answerBox());
      await user.keyboard('Draft answer.');
      await user.click(screen.getByRole('combobox', { name: /Category/ }));
      await user.click(await screen.findByRole('option', { name: 'General' }));
      await user.click(screen.getByRole('combobox', { name: /Status/ }));
      await user.click(await screen.findByRole('option', { name: 'Published' }));
      await user.click(screen.getByRole('button', { name: 'Save as draft' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/faqs'));
      expect(mockDb.faqs().find((faq) => faq.question === 'Draft question?')?.status).toBe('draft');
      expect(messages()).toContain('FAQ saved as draft.');
    },
    LONG_FLOW_MS,
  );

  it('edits a FAQ and sends only the changed fields', async () => {
    signInAs(mockUsers.admin);
    const bodies: unknown[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PATCH')
        void request
          .clone()
          .json()
          .then((body) => bodies.push(body));
    });
    const { user, router } = renderPage('/faqs/2/edit');

    const question = await screen.findByDisplayValue(
      'What is the registration fee for individual sellers?',
    );
    expect(screen.getByRole('spinbutton', { name: 'Display order' })).toHaveValue(2);
    await user.clear(question);
    await user.type(question, 'What does seller registration cost?');
    const order = screen.getByRole('spinbutton', { name: 'Display order' });
    await user.clear(order);
    await user.type(order, '5');
    await user.click(screen.getByRole('button', { name: 'Save FAQ' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/faqs'));
    expect(mockDb.findFaq(2)).toMatchObject({
      question: 'What does seller registration cost?',
      sortOrder: 5,
      status: 'publish',
    });
    expect(bodies).toEqual([{ question: 'What does seller registration cost?', sortOrder: 5 }]);
    expect(messages()).toContain('FAQ updated.');
    server.events.removeAllListeners();
  });

  it('puts server validation errors on their fields', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.patch(apiPath('/admin/faqs/:id'), () =>
        problem(400, 'validation_failed', 'Validation failed', {
          errors: { question: 'size must be between 0 and 500' },
        }),
      ),
    );
    const { user } = renderPage('/faqs/2/edit');

    const question = await screen.findByDisplayValue(
      'What is the registration fee for individual sellers?',
    );
    await user.type(question, ' Extra');
    await user.click(screen.getByRole('button', { name: 'Save FAQ' }));

    expect(await screen.findByText('size must be between 0 and 500')).toBeInTheDocument();
    expect(questionBox()).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the status for a role without the publish permission', async () => {
    signInAs(mockUsers.faqEditor);
    const { user, router } = renderPage('/faqs/2/edit');

    await screen.findByDisplayValue('What is the registration fee for individual sellers?');
    expect(screen.getByRole('combobox', { name: /Status/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.queryByRole('button', { name: 'Save as draft' })).toBeNull();

    await user.type(screen.getByRole('spinbutton', { name: 'Display order' }), '0');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/faqs'));
    expect(mockDb.findFaq(2)).toMatchObject({ sortOrder: 20, status: 'publish' });
  });

  it('shows the publish permission error from the server', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.patch(apiPath('/admin/faqs/:id'), () =>
        problem(403, 'faq_publish_forbidden', 'Changing the status of a FAQ needs FAQ_PUBLISH.'),
      ),
    );
    const { user } = renderPage('/faqs/8/edit');

    await screen.findByDisplayValue('What are the charges for additional posts?');
    await user.click(screen.getByRole('combobox', { name: /Status/ }));
    await user.click(await screen.findByRole('option', { name: 'Published' }));
    await user.click(screen.getByRole('button', { name: 'Save FAQ' }));

    expect(
      await screen.findByText(/You do not have permission to publish or unpublish FAQs/),
    ).toBeInTheDocument();
  });

  it('reports a FAQ that does not exist', async () => {
    signInAs(mockUsers.admin);
    renderPage('/faqs/999/edit');
    expect(await screen.findByText('This FAQ does not exist or was deleted.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to FAQs' })).toBeInTheDocument();
  });

  it('starts at display order 0 when the suggestion cannot be loaded', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.get(apiPath('/admin/faqs'), () => HttpResponse.json({}, { status: 500 }), {
        once: true,
      }),
    );
    renderPage('/faqs/new');
    expect(await screen.findByRole('spinbutton', { name: 'Display order' })).toHaveValue(0);
  });
});
