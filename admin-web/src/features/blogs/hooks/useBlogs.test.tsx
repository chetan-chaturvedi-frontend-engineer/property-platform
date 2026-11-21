import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import { useBlogExport } from './useBlogExport';
import { useBlogPermissions } from './useBlogPermissions';
import {
  useBlog,
  useBlogBySlug,
  useBlogCategories,
  useBlogCounts,
  useBlogImageFile,
  useBlogs,
  useBlogTagSuggestions,
  useChangeBlogStatus,
  useCreateBlog,
  useDeleteBlog,
  useRemoveBlogImage,
  useUpdateBlog,
} from './useBlogs';

/** The app's client: mutation `meta` (success toasts, invalidation) is handled there. */
function appClient() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return client;
}

/** Captures CSV downloads (jsdom has no object URLs). */
function captureDownloads() {
  const blobs: Blob[] = [];
  Object.assign(URL, {
    createObjectURL: jest.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:csv';
    }),
    revokeObjectURL: jest.fn(),
  });
  return blobs;
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);

describe('blog hooks', () => {
  beforeEach(() => signInAs(mockUsers.admin));

  it('counts blogs by state with one-row list requests', async () => {
    const { result } = renderHookWithQuery(() => useBlogCounts());
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual({
      total: 14,
      drafts: 3,
      published: 11,
      scheduled: 2,
      live: 9,
    });
  });

  it('lists a filtered, sorted page', async () => {
    const { result } = renderHookWithQuery(() =>
      useBlogs({ status: 'publish', categoryId: 4, sort: 'title,asc', page: 0, size: 2 }),
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.totalElements).toBe(3);
    expect(result.current.data?.content.map((blog) => blog.title)).toEqual([
      'Legal Documents Required for Property Purchase',
      'RERA Explained',
    ]);
  });

  it('loads one blog with its content and SEO fields', async () => {
    const { result } = renderHookWithQuery(() => useBlog(1));
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toMatchObject({
      id: 1,
      publicState: 'live',
      category: { id: 1, title: 'Buying Tips', status: 'active' },
      metaTitle: 'Top 10 Tips for First-Time Home Buyers | Dwellery',
    });
    expect(result.current.data?.content).toContain('<h2>');
  });

  it('finds the blog using a slug, and nothing for a free one', async () => {
    const taken = renderHookWithQuery(() => useBlogBySlug('rera-explained'));
    await waitFor(() => expect(taken.result.current.data).toBeDefined());
    expect(taken.result.current.data?.id).toBe(13);

    const free = renderHookWithQuery(() => useBlogBySlug('rera'));
    await waitFor(() => expect(free.result.current.isSuccess).toBe(true));
    expect(free.result.current.data).toBeNull();

    const empty = renderHookWithQuery(() => useBlogBySlug(''));
    expect(empty.result.current.fetchStatus).toBe('idle');
  });

  it('collects tag suggestions and categories', async () => {
    const tags = renderHookWithQuery(() => useBlogTagSuggestions());
    const categories = renderHookWithQuery(() => useBlogCategories());
    await waitFor(() => expect(tags.result.current.data).toBeDefined());
    expect(tags.result.current.data).toContain('home loans');
    expect(new Set(tags.result.current.data).size).toBe(tags.result.current.data?.length);
    await waitFor(() => expect(categories.result.current.data).toHaveLength(5));
    expect(categories.result.current.data?.[0]).toMatchObject({
      title: 'Archived News',
      blogCount: 1,
    });
  });

  it('downloads a feature image for a copy, or null without one', async () => {
    const withImage = renderHookWithQuery(() =>
      useBlogImageFile({
        id: 1,
        featureImageUrl: '/api/v1/admin/blogs/1/feature-image/seed-blog-1.png',
      }),
    );
    await waitFor(() => expect(withImage.result.current.data).toBeDefined());
    expect(withImage.result.current.data?.file.name).toMatch(/^blog-1-copy\./);

    const without = renderHookWithQuery(() => useBlogImageFile({ id: 7, featureImageUrl: null }));
    await waitFor(() => expect(without.result.current.isSuccess).toBe(true));
    expect(without.result.current.data).toBeNull();
  });

  it('creates a blog as multipart with repeated tags', async () => {
    const sent: { form?: FormData } = {};
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') {
        void request
          .clone()
          .formData()
          .then((data) => {
            sent.form = data;
          });
      }
    });
    const { result } = renderHookWithQuery(() => useCreateBlog());
    let created: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      created = await result.current.mutateAsync({
        request: {
          title: 'Hook post',
          content: '<p>Hello</p>',
          categoryId: 1,
          status: 'publish',
          tags: ['a', 'b'],
        },
        featureImage: null,
      });
    });
    expect(created).toMatchObject({ slug: 'hook-post', status: 'publish', publicState: 'live' });
    await waitFor(() => expect(sent.form).toBeDefined());
    expect(sent.form?.getAll('tags')).toEqual(['a', 'b']);
    expect(sent.form?.get('categoryId')).toBe('1');
    expect(sent.form?.has('featureImage')).toBe(false);
    server.events.removeAllListeners();
  });

  it('updates, changes status, removes the image and deletes', async () => {
    const update = renderHookWithQuery(() => useUpdateBlog());
    await act(() =>
      update.result.current.mutateAsync({ id: 6, request: { metaDescription: 'Seo' } }),
    );
    expect(mockDb.findBlog(6)?.metaDescription).toBe('Seo');

    const status = renderHookWithQuery(() => useChangeBlogStatus(), appClient());
    await act(() => status.result.current.mutateAsync({ id: 10, status: 'publish' }));
    expect(mockDb.findBlog(10)).toMatchObject({ status: 'publish' });
    expect(mockDb.findBlog(10)?.publishedAt).not.toBeNull();
    expect(messages()).toContain('Blog status updated.');

    const image = renderHookWithQuery(() => useRemoveBlogImage());
    await act(() => image.result.current.mutateAsync(1));
    expect(mockDb.findBlog(1)?.imageFile).toBeNull();

    const remove = renderHookWithQuery(() => useDeleteBlog(), appClient());
    await act(() => remove.result.current.mutateAsync(2));
    expect(mockDb.findBlog(2)).toBeUndefined();
    expect(messages()).toContain('Blog deleted.');
  });

  it('exports every matching blog as CSV', async () => {
    const downloads = captureDownloads();
    const { result } = renderHookWithQuery(() => useBlogExport());
    await act(() => result.current.exportMatching({ status: 'draft' }));
    expect(downloads).toHaveLength(1);
    const content = (await downloads[0]?.text()) ?? '';
    // Header plus the three drafts.
    expect(content.trim().split(/\r?\n/)).toHaveLength(4);
    expect(messages()).toContain('Exported 3 blogs.');
  });

  it('reports an empty export instead of downloading', async () => {
    const downloads = captureDownloads();
    server.use(
      http.get(apiPath('/admin/blogs'), () =>
        HttpResponse.json({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 }),
      ),
    );
    const { result } = renderHookWithQuery(() => useBlogExport());
    await act(() => result.current.exportMatching({}));
    expect(downloads).toHaveLength(0);
    expect(messages()).toContain('No blogs match these filters.');
  });
});

describe('useBlogPermissions', () => {
  it('derives actions from permission codes', () => {
    signInAs(mockUsers.blogWriter);
    const { result } = renderHookWithQuery(() => useBlogPermissions());
    expect(result.current).toEqual({
      canView: true,
      canCreate: true,
      canEdit: true,
      canDuplicate: true,
      canChangeStatus: true,
      canDelete: false,
      canViewCategories: false,
      canCreateCategories: false,
    });
  });
});
