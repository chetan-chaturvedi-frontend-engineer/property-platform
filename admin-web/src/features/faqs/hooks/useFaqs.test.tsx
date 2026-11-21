import { act, waitFor } from '@testing-library/react';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import { useFaqPermissions } from './useFaqPermissions';
import {
  useChangeFaqStatus,
  useCreateFaq,
  useDeleteFaq,
  useFaq,
  useFaqCategories,
  useFaqCounts,
  useFaqs,
  useNextFaqSortOrder,
  useUpdateFaq,
} from './useFaqs';

/** The app's client: mutation `meta` (success toasts, invalidation) is handled there. */
function appClient() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return client;
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);

describe('FAQ hooks', () => {
  beforeEach(() => signInAs(mockUsers.admin));

  it('lists a filtered, sorted page and counts by status', async () => {
    const { result } = renderHookWithQuery(() => ({
      list: useFaqs({ status: 'draft', sort: 'question,asc', page: 0, size: 2 }),
      counts: useFaqCounts(),
    }));

    await waitFor(() => expect(result.current.list.data).toBeDefined());
    expect(result.current.list.data).toMatchObject({ totalElements: 3, totalPages: 2, size: 2 });
    expect(result.current.list.data?.content.map((faq) => faq.question)).toEqual([
      'Can I get a refund for an unused plan?',
      'Is my phone number shown to buyers?',
    ]);
    // List items carry no answer.
    expect(result.current.list.data?.content[0]).not.toHaveProperty('answer');

    await waitFor(() => expect(result.current.counts.data).toBeDefined());
    expect(result.current.counts.data).toEqual({ total: 16, published: 13, drafts: 3 });
  });

  it('loads a FAQ with its answer, the categories and the next display order', async () => {
    const { result } = renderHookWithQuery(() => ({
      faq: useFaq(16),
      categories: useFaqCategories(),
      next: useNextFaqSortOrder(),
    }));

    await waitFor(() => expect(result.current.faq.data).toBeDefined());
    // Its category was removed from the configuration.
    expect(result.current.faq.data).toMatchObject({ category: 'offers', categoryLabel: null });
    expect(result.current.faq.data?.answer).toContain('Old offer terms');
    await waitFor(() => expect(result.current.categories.data).toHaveLength(3));
    await waitFor(() => expect(result.current.next.data).toBe(17));
  });

  it('creates, updates, changes status and deletes, refreshing the counts', async () => {
    const client = appClient();
    const { result } = renderHookWithQuery(
      () => ({
        counts: useFaqCounts(),
        create: useCreateFaq(),
        update: useUpdateFaq(),
        status: useChangeFaqStatus(),
        remove: useDeleteFaq(),
      }),
      client,
    );
    await waitFor(() => expect(result.current.counts.data?.total).toBe(16));

    let id = 0;
    await act(async () => {
      const created = await result.current.create.mutateAsync({
        question: '  New question?  ',
        answer: '<p>New answer</p><script>alert(1)</script>',
        category: 'general',
      });
      id = created.id;
      expect(created).toMatchObject({
        question: 'New question?',
        status: 'draft',
        sortOrder: 0,
        categoryLabel: 'General',
      });
      expect(created.answer).not.toContain('script');
    });
    await waitFor(() => expect(result.current.counts.data?.total).toBe(17));

    await act(async () => {
      await result.current.update.mutateAsync({ id, request: { sortOrder: 3 } });
    });
    expect(mockDb.findFaq(id)?.sortOrder).toBe(3);

    await act(async () => {
      await result.current.status.mutateAsync({ id, status: 'publish' });
    });
    expect(mockDb.findFaq(id)?.status).toBe('publish');
    expect(messages()).toContain('FAQ status updated.');
    await waitFor(() => expect(result.current.counts.data?.published).toBe(14));

    await act(async () => {
      await result.current.remove.mutateAsync(id);
    });
    expect(mockDb.findFaq(id)).toBeUndefined();
    expect(messages()).toContain('FAQ deleted.');
    await waitFor(() => expect(result.current.counts.data?.total).toBe(16));
  });

  it('rejects a status change without the publish permission', async () => {
    signInAs(mockUsers.faqEditor);
    const { result } = renderHookWithQuery(() => useUpdateFaq(), appClient());

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 8, request: { status: 'publish' } }),
      ).rejects.toMatchObject({ code: 'faq_publish_forbidden' });
    });
    expect(mockDb.findFaq(8)?.status).toBe('draft');
  });

  it('derives what the UI may offer from the permissions', () => {
    const admin = renderHookWithQuery(() => useFaqPermissions());
    expect(admin.result.current).toEqual({
      canView: true,
      canCreate: true,
      canEdit: true,
      canPublish: true,
      canChangeStatus: true,
      canDelete: true,
    });

    signInAs(mockUsers.faqEditor);
    const editor = renderHookWithQuery(() => useFaqPermissions());
    expect(editor.result.current).toMatchObject({
      canEdit: true,
      canPublish: false,
      canChangeStatus: false,
      canDelete: false,
    });
  });
});
