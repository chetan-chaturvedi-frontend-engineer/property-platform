import { act, waitFor } from '@testing-library/react';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import { useContentPagePermissions } from './useContentPagePermissions';
import {
  useChangeContentPageStatus,
  useContentPage,
  useContentPageBySlug,
  useContentPageCounts,
  useContentPages,
  useCreateContentPage,
  useDeleteContentPage,
  useUpdateContentPage,
} from './useContentPages';

function appClient() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return client;
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);

describe('content page hooks', () => {
  beforeEach(() => signInAs(mockUsers.admin));

  it('lists a filtered, sorted page and counts by status and type', async () => {
    const { result } = renderHookWithQuery(() => ({
      list: useContentPages({ type: 'system', sort: 'heading,asc', page: 0, size: 2 }),
      counts: useContentPageCounts(),
    }));

    await waitFor(() => expect(result.current.list.data).toBeDefined());
    expect(result.current.list.data).toMatchObject({ totalElements: 4, totalPages: 2 });
    expect(result.current.list.data?.content.map((page) => page.heading)).toEqual([
      'Privacy policy',
      'Refund and cancellation policy',
    ]);
    expect(result.current.list.data?.content[0]).not.toHaveProperty('content');

    await waitFor(() => expect(result.current.counts.data).toBeDefined());
    expect(result.current.counts.data).toEqual({ total: 12, published: 9, drafts: 3, system: 4 });
  });

  it('loads a page with its content and finds the owner of a slug', async () => {
    const { result } = renderHookWithQuery(() => ({
      page: useContentPage(3),
      owner: useContentPageBySlug('careers'),
      free: useContentPageBySlug('care'),
    }));

    await waitFor(() => expect(result.current.page.data).toBeDefined());
    expect(result.current.page.data).toMatchObject({
      heading: 'Privacy policy',
      metaKeywords: 'privacy, data protection',
    });
    await waitFor(() => expect(result.current.owner.data?.heading).toBe('Careers'));
    // "care" matches "careers" in the search, but no page has exactly that slug.
    await waitFor(() => expect(result.current.free.data).toBeNull());
  });

  it('creates, updates, changes status and deletes', async () => {
    const queryClient = appClient();
    const { result } = renderHookWithQuery(
      () => ({
        create: useCreateContentPage(),
        update: useUpdateContentPage(),
        status: useChangeContentPageStatus(),
        remove: useDeleteContentPage(),
      }),
      queryClient,
    );

    let id = 0;
    await act(async () => {
      const created = await result.current.create.mutateAsync({
        heading: 'About us',
        content: '<p>Again</p>',
      });
      id = created.id;
      // Generated from the heading and made unique.
      expect(created).toMatchObject({ slug: 'about-us-2', type: 'static', status: 'draft' });
    });

    await act(async () => {
      await result.current.update.mutateAsync({ id, request: { metaTitle: 'About' } });
    });
    expect(mockDb.findContentPage(id)?.metaTitle).toBe('About');

    await act(async () => {
      await result.current.status.mutateAsync({ id, status: 'publish' });
    });
    expect(mockDb.findContentPage(id)?.status).toBe('publish');
    expect(messages()).toContain('Page status updated.');

    await act(async () => {
      await result.current.remove.mutateAsync(id);
    });
    expect(mockDb.findContentPage(id)).toBeUndefined();
    expect(messages()).toContain('Page deleted.');
  });

  it('maps permissions to UI hints', () => {
    const admin = renderHookWithQuery(() => useContentPagePermissions());
    expect(admin.result.current).toEqual({
      canView: true,
      canCreate: true,
      canEdit: true,
      canPublish: true,
      canChangeStatus: true,
      canDelete: true,
    });

    signInAs(mockUsers.pageEditor);
    const editor = renderHookWithQuery(() => useContentPagePermissions());
    expect(editor.result.current).toMatchObject({
      canEdit: true,
      canPublish: false,
      canChangeStatus: false,
      canDelete: false,
    });
  });
});
