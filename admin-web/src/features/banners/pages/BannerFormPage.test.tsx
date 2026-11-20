import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { decodeMockImage } from '@/tests/mocks/bannerMockData';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';

import { BannerFormPage } from './BannerFormPage';

const LONG_FLOW_MS = 30_000;

function renderForm(path: string) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/banners', element: <p>Banner list</p> },
      { path: '/banners/new', element: <BannerFormPage /> },
      { path: '/banners/:id/edit', element: <BannerFormPage /> },
    ],
    { initialPath: path, queryClient },
  );
}

const png = () => new File([decodeMockImage('green')], 'holi.png', { type: 'image/png' });
const messages = () => useNotificationStore.getState().queue.map((item) => item.message);
const form = () => screen.getByRole('form', { name: 'Banner information' });

async function choose(user: ReturnType<typeof renderForm>['user'], label: RegExp, option: string) {
  await user.click(within(form()).getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('BannerFormPage: add', () => {
  it(
    'creates an active banner with an internal page link and an uploaded image',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderForm('/banners/new');

      expect(await screen.findByRole('heading', { name: 'Add new banner' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Banner guidelines' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Tips for better banners' })).toBeInTheDocument();
      expect(screen.getByText('Upload an image to see the real preview')).toBeInTheDocument();

      await user.type(within(form()).getByRole('textbox', { name: /Banner title/ }), 'Holi offer');
      // The preview follows the form without saving.
      const preview = screen.getByRole('region', { name: 'Banner preview' });
      expect(within(preview).getByText('Holi offer')).toBeInTheDocument();

      await choose(user, /Banner type/, 'Offer');
      await choose(user, /Placement/, 'Homepage - Middle');
      await choose(user, /Select page/, 'About us');
      await user.upload(screen.getByLabelText(/^Banner image/), png());
      expect(await within(preview).findByRole('img', { name: 'Holi offer' })).toHaveAttribute(
        'src',
        expect.stringMatching(/^data:image\/png;base64,/),
      );
      expect(screen.getByText(/holi\.png/)).toBeInTheDocument();
      expect(within(preview).getByText('App page /pages/about-us')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Save banner' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/banners'));
      expect(messages()).toContain('Banner created.');
      const created = mockDb.banners().find((banner) => banner.title === 'Holi offer');
      expect(created).toMatchObject({
        type: 'offer',
        placement: 'home_middle',
        linkType: 'internal',
        link: '/pages/about-us',
        status: 'active',
        startDate: null,
        endDate: null,
      });
    },
    LONG_FLOW_MS,
  );

  it('shows the required-field errors and rejects files that are not images', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderForm('/banners/new');
    await user.click(await screen.findByRole('button', { name: 'Save banner' }));

    expect(await screen.findByText('Enter the banner title')).toBeInTheDocument();
    expect(screen.getByText('Select the banner type')).toBeInTheDocument();
    expect(screen.getByText('Select where the banner is shown')).toBeInTheDocument();
    expect(screen.getByText('Select the page to open')).toBeInTheDocument();
    expect(screen.getByText('Upload the banner image')).toBeInTheDocument();

    await user.upload(
      screen.getByLabelText(/^Banner image/),
      new File(['<svg/>'], 'logo.png', { type: 'image/png' }),
    );
    expect(await screen.findByText(/Unsupported file type/)).toBeInTheDocument();
  });

  it('validates external URLs and the schedule', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderForm('/banners/new');
    await user.click(await screen.findByRole('radio', { name: 'External link' }));
    const url = within(form()).getByRole('textbox', { name: /External URL/ });
    await user.type(url, 'http://example.com');
    await user.click(screen.getByRole('switch', { name: /Schedule banner/ }));
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2099-05-20T10:00' },
    });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2099-05-19T10:00' } });
    await user.click(screen.getByRole('button', { name: 'Save banner' }));

    expect(
      await screen.findByText('Enter an https:// URL without a username or password'),
    ).toBeInTheDocument();
    expect(screen.getByText('The end must be after the start')).toBeInTheDocument();
    expect(screen.getByText(/Times are in your time zone/)).toBeInTheDocument();
  });

  it(
    'puts a link error from the server on the link field',
    async () => {
      signInAs(mockUsers.admin);
      server.use(
        http.post(apiPath('/admin/banners'), () =>
          problem(400, 'validation_failed', 'Validation failed', {
            errors: { link: 'must be a path to an allowed app route, e.g. /offers' },
          }),
        ),
      );
      const { user } = renderForm('/banners/new');
      await user.type(await within(form()).findByRole('textbox', { name: /Banner title/ }), 'X');
      await choose(user, /Banner type/, 'Offer');
      await choose(user, /Placement/, 'Homepage - Top');
      await choose(user, /Select page/, 'Offers');
      await user.upload(screen.getByLabelText(/^Banner image/), png());
      await screen.findByText(/holi\.png/);
      await user.click(screen.getByRole('button', { name: 'Save banner' }));

      expect(
        await screen.findByText('must be a path to an allowed app route, e.g. /offers'),
      ).toBeInTheDocument();
      expect(within(form()).getByRole('combobox', { name: /Select page/ })).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    },
    LONG_FLOW_MS,
  );

  it(
    'saves banners as inactive for a role without the status permission',
    async () => {
      signInAs(mockUsers.bannerEditor);
      const { user, router } = renderForm('/banners/new');
      expect(await screen.findByRole('radio', { name: 'Inactive' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Active' })).toBeDisabled();
      expect(screen.getByText(/saved as inactive/)).toBeInTheDocument();
      // No page permission: content pages are not offered, custom paths still are.
      expect(screen.getByText(/no permission to view pages/)).toBeInTheDocument();

      await user.type(within(form()).getByRole('textbox', { name: /Banner title/ }), 'Draft promo');
      await choose(user, /Banner type/, 'Promotion');
      await choose(user, /Placement/, 'Property details');
      await choose(user, /Select page/, 'Custom path…');
      await user.type(within(form()).getByRole('textbox', { name: /App path/ }), '/properties/42');
      await user.upload(screen.getByLabelText(/^Banner image/), png());
      await screen.findByText(/holi\.png/);
      await user.click(screen.getByRole('button', { name: 'Save banner' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/banners'));
      expect(mockDb.banners().find((banner) => banner.title === 'Draft promo')).toMatchObject({
        status: 'inactive',
        link: '/properties/42',
      });
    },
    LONG_FLOW_MS,
  );

  it('asks before leaving with unsaved changes', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderForm('/banners/new');
    await user.type(
      await within(form()).findByRole('textbox', { name: /Banner title/ }),
      'Unsaved',
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    const dialog = await screen.findByRole('dialog', { name: 'Discard changes?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/banners/new');

    await user.click(screen.getByRole('button', { name: 'Back to banners' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Discard changes?' })).getByRole('button', {
        name: 'Discard',
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/banners'));
  });

  it('leaves without asking when nothing changed', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderForm('/banners/new');
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/banners'));
  });
});

describe('BannerFormPage: edit and duplicate', () => {
  it(
    'prefills the banner, saves only the changes and keeps the image',
    async () => {
      signInAs(mockUsers.admin);
      const imageBefore = mockDb.findBanner(5)?.imageFile;
      const { user, router } = renderForm('/banners/5/edit');

      const title = await within(
        await screen.findByRole('form', { name: 'Banner information' }),
      ).findByRole('textbox', { name: /Banner title/ });
      expect(title).toHaveValue('Invest in the future');
      expect(screen.getByRole('radio', { name: 'External link' })).toBeChecked();
      expect(within(form()).getByRole('textbox', { name: /External URL/ })).toHaveValue(
        'https://invest.example.com/future',
      );
      expect(screen.getByRole('switch', { name: /Schedule banner/ })).toBeChecked();
      expect(screen.getByText('Current image')).toBeInTheDocument();

      await user.clear(title);
      await user.type(title, 'Invest smart');
      await user.click(screen.getByRole('switch', { name: /Schedule banner/ }));
      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/banners'));
      expect(messages()).toContain('Banner updated.');
      expect(mockDb.findBanner(5)).toMatchObject({
        title: 'Invest smart',
        startDate: null,
        endDate: null,
        imageFile: imageBefore,
      });
    },
    LONG_FLOW_MS,
  );

  it('replaces only the image when nothing else changed', async () => {
    signInAs(mockUsers.admin);
    const imageBefore = mockDb.findBanner(2)?.imageFile;
    const { user, router } = renderForm('/banners/2/edit');
    await user.click(await screen.findByRole('button', { name: 'Replace' }));
    await user.upload(screen.getByLabelText(/^Banner image/), png());
    await screen.findByText(/holi\.png/);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/banners'));
    expect(messages()).toContain('Banner updated.');
    expect(mockDb.findBanner(2)?.imageFile).not.toBe(imageBefore);
    expect(mockDb.findBanner(2)?.title).toBe('Premium properties for your luxury life');
  });

  it('sends nothing when the form is saved unchanged', async () => {
    signInAs(mockUsers.admin);
    const writes: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.method !== 'GET') writes.push(request.method);
    });
    const { user, router } = renderForm('/banners/2/edit');
    await within(await screen.findByRole('form', { name: 'Banner information' })).findByRole(
      'textbox',
      { name: /Banner title/ },
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/banners'));
    expect(messages()).toContain('No changes to save.');
    expect(writes).toEqual([]);
    server.events.removeAllListeners();
  });

  it('keeps a saved path that is not in the page list', async () => {
    signInAs(mockUsers.admin);
    renderForm('/banners/7/edit');
    expect(
      await within(await screen.findByRole('form', { name: 'Banner information' })).findByRole(
        'combobox',
        { name: /Select page/ },
      ),
    ).toHaveTextContent('/offers/diwali');
  });

  it('shows a not-found message for unknown or deleted banners', async () => {
    signInAs(mockUsers.admin);
    mockDb.softDeleteBanner(3);
    renderForm('/banners/3/edit');
    expect(
      await screen.findByText('This banner does not exist or was deleted.'),
    ).toBeInTheDocument();
  });

  it(
    'duplicates a banner, with its image, as a new inactive banner',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderForm('/banners/new?from=7');

      expect(await screen.findByRole('heading', { name: 'Duplicate banner' })).toBeInTheDocument();
      expect(
        within(await screen.findByRole('form', { name: 'Banner information' })).getByRole(
          'textbox',
          { name: /Banner title/ },
        ),
      ).toHaveValue('Copy of Diwali festive offer');
      expect(screen.getByRole('radio', { name: 'Inactive' })).toBeChecked();
      expect(screen.getByText(/Copied from "Diwali festive offer"/)).toBeInTheDocument();
      expect(screen.getByText(/banner-7-copy\.png/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Save banner' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/banners'));
      expect(messages()).toContain('Banner duplicated.');
      const copy = mockDb
        .banners()
        .find((banner) => banner.title === 'Copy of Diwali festive offer');
      expect(copy).toMatchObject({
        status: 'inactive',
        link: '/offers/diwali',
        placement: 'home_top',
      });
      expect(copy?.id).not.toBe(7);
    },
    LONG_FLOW_MS,
  );
});
