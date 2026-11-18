import { act, waitFor } from '@testing-library/react';
import { useState } from 'react';

import { mockUsers } from '@/tests/mocks/mockDb';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import { systemLogKeys, useSystemLogs } from './useSystemLogs';

describe('useSystemLogs', () => {
  it('loads a page of logs and caches it under the filter key', async () => {
    signInAs(mockUsers.admin);
    const filters = { page: 0, size: 5 };

    const { result, queryClient } = renderHookWithQuery(() => useSystemLogs(filters));

    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.content).toHaveLength(5);
    expect(result.current.data?.totalElements).toBe(42);
    expect(queryClient.getQueryData(systemLogKeys.list(filters))).toEqual(result.current.data);
  });

  it('passes filters to the API', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() =>
      useSystemLogs({ page: 0, size: 100, logLevel: 'warning' }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.content.every((log) => log.logLevel === 'warning')).toBe(true);
    expect(result.current.data?.totalElements).toBe(14);
  });

  it('exposes a normalized ApiError when the role lacks the permission', async () => {
    signInAs(mockUsers.manager);

    const { result } = renderHookWithQuery(() => useSystemLogs({ page: 0 }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(403);
    expect(result.current.error?.isForbidden).toBe(true);
  });

  it('does not fetch while disabled', () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() => useSystemLogs({ page: 0 }, { enabled: false }));

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('keeps the previous page visible while the next page loads', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => {
      const [page, setPage] = useState(0);
      return { query: useSystemLogs({ page, size: 10 }), setPage };
    });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    const firstPageIds = result.current.query.data?.content.map((log) => log.id);

    act(() => result.current.setPage(1));

    expect(result.current.query.isPlaceholderData).toBe(true);
    expect(result.current.query.data?.content.map((log) => log.id)).toEqual(firstPageIds);
    await waitFor(() => expect(result.current.query.isPlaceholderData).toBe(false));
    expect(result.current.query.data?.page).toBe(1);
  });
});
