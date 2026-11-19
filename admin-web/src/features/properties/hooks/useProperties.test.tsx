import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { apiPath } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import {
  propertyKeys,
  useCreateProperty,
  useProperties,
  useProperty,
  usePropertyStats,
  useUpdateLocation,
} from './useProperties';

const DETAILS = {
  propertyType: 'apartment' as const,
  projectName: 'Green Valley Residency',
  builderCompanyName: 'Green Builders',
  projectEmail: 'sales@green.example.com',
  projectPhone: '98765 43210',
};

describe('useProperties', () => {
  it('sends only the filters that are set, with paging and sort', async () => {
    signInAs(mockUsers.admin);
    let query: URLSearchParams | null = null;
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/admin/properties?')) {
        query = new URL(request.url).searchParams;
      }
    });

    const { result } = renderHookWithQuery(() =>
      useProperties({
        page: 0,
        size: 10,
        sort: 'projectName,asc',
        publicationStatus: 'pending_review',
        search: '',
        city: undefined,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalElements).toBe(5);
    expect(
      result.current.data?.content.every((p) => p.publicationStatus === 'pending_review'),
    ).toBe(true);
    expect(query).not.toBeNull();
    const params = query as unknown as URLSearchParams;
    expect(params.get('publicationStatus')).toBe('pending_review');
    expect(params.get('sort')).toBe('projectName,asc');
    expect(params.has('search')).toBe(false);
    expect(params.has('city')).toBe(false);
    server.events.removeAllListeners();
  });

  it('loads server-side statistics', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => usePropertyStats());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      total: 26,
      deleted: 0,
      byPublicationStatus: { pending_review: 5, approved: 5, published: 6, draft: 4 },
    });
  });
});

describe('property writes', () => {
  it('creates once per idempotency key, even when the request is retried', async () => {
    signInAs(mockUsers.admin);
    const before = mockDb.properties().length;
    const { result } = renderHookWithQuery(() => useCreateProperty());

    const first = await act(() =>
      result.current.mutateAsync({ request: DETAILS, idempotencyKey: 'key-123456' }),
    );
    const retry = await act(() =>
      result.current.mutateAsync({ request: DETAILS, idempotencyKey: 'key-123456' }),
    );

    expect(retry.id).toBe(first.id);
    expect(mockDb.properties()).toHaveLength(before + 1);
    expect(first.publicationStatus).toBe('draft');
  });

  it('sends If-Match and puts the returned property in the cache', async () => {
    signInAs(mockUsers.admin);
    let ifMatch: string | null = null;
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PATCH') ifMatch = request.headers.get('If-Match');
    });
    const { result, queryClient } = renderHookWithQuery(() => ({
      detail: useProperty(4),
      update: useUpdateLocation(),
    }));
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));
    const version = result.current.detail.data?.version ?? 0;

    await act(() => result.current.update.mutateAsync({ id: 4, version, body: { city: 'Pune' } }));

    expect(ifMatch).toBe(`"${version}"`);
    const cached = queryClient.getQueryData<{ version: number; location: { city: string } }>(
      propertyKeys.detail(4),
    );
    expect(cached?.version).toBe(version + 1);
    expect(cached?.location.city).toBe('Pune');
    server.events.removeAllListeners();
  });

  it('rejects a write based on a stale version with property_version_conflict', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useUpdateLocation());

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 4, version: 1, body: { city: 'Pune' } }),
      ).rejects.toMatchObject({ status: 409, code: 'property_version_conflict' });
    });
    expect(mockDb.findProperty(4)?.location.city).toBeNull();
  });

  it('surfaces permission errors from the server', async () => {
    signInAs(mockUsers.propertyViewer);
    server.use(
      http.get(apiPath('/admin/properties/stats'), () =>
        HttpResponse.json(
          { status: 403, code: 'access_denied', detail: 'Access denied.' },
          { status: 403 },
        ),
      ),
    );
    const { result } = renderHookWithQuery(() => usePropertyStats());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(403);
  });
});
