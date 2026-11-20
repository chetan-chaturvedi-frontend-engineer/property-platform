import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { decodeMockImage } from '@/tests/mocks/bannerMockData';
import { apiPath } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import {
  bannerKeys,
  useBanner,
  useBannerActivity,
  useBannerCounts,
  useBannerImageFile,
  useBanners,
  useChangeBannerStatus,
  useContentPages,
  useCreateBanner,
  useDeleteBanner,
  useReplaceBannerImage,
  useUpdateBanner,
} from './useBanners';

/** 12 banners: 7 live, 2 scheduled (5, 6), 1 expired (9), 2 inactive (4, 10). See bannerMockData. */
const TOTAL = 12;

function appClient() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return client;
}

const png = () => new File([decodeMockImage('purple')], 'new.png', { type: 'image/png' });

describe('banner queries', () => {
  it('loads a page, newest first, and caches it under the filter key', async () => {
    signInAs(mockUsers.admin);
    const filters = { page: 0, size: 5 };
    const { result, queryClient } = renderHookWithQuery(() => useBanners(filters));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalElements).toBe(TOTAL);
    expect(result.current.data?.content.map((banner) => banner.id)).toEqual([12, 11, 10, 9, 8]);
    expect(result.current.data?.content[3]?.displayState).toBe('expired');
    expect(queryClient.getQueryData(bannerKeys.list(filters))).toEqual(result.current.data);
  });

  it('sends search, status, type, placement and sort to the API', async () => {
    signInAs(mockUsers.admin);
    let query: URLSearchParams | undefined;
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/admin/banners?')) query = new URL(request.url).searchParams;
    });
    const { result } = renderHookWithQuery(() =>
      useBanners({
        page: 0,
        size: 50,
        search: 'sale',
        status: 'active',
        type: 'offer',
        placement: 'property_list',
        sort: 'title,asc',
      }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.content.map((banner) => banner.title)).toEqual(['Monsoon sale']);
    expect(query?.get('search')).toBe('sale');
    expect(query?.get('sort')).toBe('title,asc');
    expect(query?.has('linkType')).toBe(false);
    server.events.removeAllListeners();
  });

  it('derives the overview counts from list totals', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useBannerCounts());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      total: TOTAL,
      active: 10,
      inactive: 2,
      scheduled: 2,
      expired: 1,
      live: 7,
    });
  });

  it('loads one banner and reports 404 for deleted ones', async () => {
    signInAs(mockUsers.admin);
    mockDb.softDeleteBanner(3);
    const { result } = renderHookWithQuery(() => ({ found: useBanner(1), gone: useBanner(3) }));
    await waitFor(() => expect(result.current.found.isSuccess).toBe(true));
    expect(result.current.found.data?.title).toBe('Find your dream home');
    await waitFor(() => expect(result.current.gone.isError).toBe(true));
    expect(result.current.gone.error?.status).toBe(404);
  });

  it('downloads a banner image as a file with a preview', async () => {
    signInAs(mockUsers.admin);
    const banner = mockDb.findBanner(2);
    const source = { id: 2, imageUrl: `/api/v1/admin/banners/2/image/${banner?.imageFile ?? ''}` };
    const { result } = renderHookWithQuery(() => useBannerImageFile(source));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.file.type).toBe('image/png');
    expect(result.current.data?.file.name).toBe('banner-2-copy.png');
    expect(result.current.data?.url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('lists published content pages and the banner activity', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => ({
      pages: useContentPages(),
      activity: useBannerActivity(11),
    }));
    await waitFor(() => expect(result.current.pages.isSuccess).toBe(true));
    expect(result.current.pages.data?.map((page) => page.slug)).toEqual([
      'about-us',
      'privacy-policy',
      'open-house',
    ]);
    await waitFor(() => expect(result.current.activity.isSuccess).toBe(true));
    expect(result.current.activity.data?.every((entry) => entry.action.length > 0)).toBe(true);
  });
});

describe('banner mutations', () => {
  it('creates a banner as multipart with progress and refreshes lists and counts', async () => {
    signInAs(mockUsers.admin);
    const client = appClient();
    const progress: number[] = [];
    const { result } = renderHookWithQuery(
      () => ({ create: useCreateBanner(), counts: useBannerCounts() }),
      client,
    );
    await waitFor(() => expect(result.current.counts.data?.total).toBe(TOTAL));

    let created: Awaited<ReturnType<typeof result.current.create.mutateAsync>> | undefined;
    await act(async () => {
      created = await result.current.create.mutateAsync({
        request: {
          title: 'Holi offer',
          type: 'offer',
          placement: 'home_top',
          linkType: 'external',
          link: 'https://example.com/holi',
          status: 'active',
        },
        image: png(),
        onProgress: (value) => progress.push(value),
      });
    });
    expect(created).toMatchObject({ title: 'Holi offer', displayState: 'live', status: 'active' });
    expect(created?.imageUrl).toMatch(/^\/api\/v1\/admin\/banners\/\d+\/image\/.+\.png$/);
    await waitFor(() => expect(result.current.counts.data?.total).toBe(TOTAL + 1));
  });

  it('rejects an active banner from a role without the status permission', async () => {
    signInAs(mockUsers.bannerEditor);
    const { result } = renderHookWithQuery(() => useCreateBanner(), appClient());
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          request: { title: 'X', type: 'offer', placement: 'home_top', status: 'active' },
          image: png(),
        }),
      ).rejects.toMatchObject({ status: 403, code: 'banner_status_change_forbidden' });
    });
  });

  it('updates fields, replaces the image, changes status and soft-deletes', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(
      () => ({
        update: useUpdateBanner(),
        image: useReplaceBannerImage(),
        status: useChangeBannerStatus(),
        remove: useDeleteBanner(),
      }),
      appClient(),
    );
    const before = mockDb.findBanner(1)?.imageFile;

    await act(async () => {
      const updated = await result.current.update.mutateAsync({
        id: 1,
        request: { title: 'Dream homes', linkType: null, link: null },
      });
      expect(updated).toMatchObject({ title: 'Dream homes', linkType: null, link: null });
    });
    await act(async () => {
      const replaced = await result.current.image.mutateAsync({ id: 1, image: png() });
      expect(replaced.imageUrl).not.toContain(before ?? 'none');
    });
    await act(async () => {
      const changed = await result.current.status.mutateAsync({ id: 1, status: 'inactive' });
      expect(changed.displayState).toBe('inactive');
    });
    await act(async () => {
      await result.current.remove.mutateAsync(1);
    });
    expect(mockDb.findBanner(1)).toBeUndefined();
  });

  it('surfaces field errors from the API', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.patch(apiPath('/admin/banners/:id'), () =>
        HttpResponse.json(
          {
            status: 400,
            code: 'validation_failed',
            detail: 'Validation failed',
            errors: { link: 'must be an https URL without credentials' },
          },
          { status: 400 },
        ),
      ),
    );
    const { result } = renderHookWithQuery(() => useUpdateBanner(), appClient());
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 1, request: { linkType: 'external', link: 'http://x' } }),
      ).rejects.toMatchObject({
        fieldErrors: { link: 'must be an https URL without credentials' },
      });
    });
  });
});
