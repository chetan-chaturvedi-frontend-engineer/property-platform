import { act, waitFor } from '@testing-library/react';
import { useState } from 'react';

import { mockUsers } from '@/tests/mocks/mockDb';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import {
  systemLogKeys,
  useSystemLog,
  useSystemLogCounts,
  useSystemLogs,
  useSystemLogUserOptions,
} from './useSystemLogs';

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

  it('combines filters, sorts and rejects out-of-range paging like the backend', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() =>
      useSystemLogs({ page: 0, size: 100, userId: 1, ipAddress: '198.51.100.24', sort: 'id,asc' }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const ids = result.current.data?.content.map((log) => log.id) ?? [];
    expect(ids).toHaveLength(11);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));

    const tooBig = renderHookWithQuery(() => useSystemLogs({ page: 0, size: 101 }));
    await waitFor(() => expect(tooBig.result.current.isError).toBe(true));
    expect(tooBig.result.current.error?.fieldErrors).toEqual({
      size: 'must be between 1 and 100',
    });
  });
});

describe('useSystemLogCounts', () => {
  it('counts all, today, warning and access-denied logs with one-row requests', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() => useSystemLogCounts());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The seeded logs are from 18 Nov 2026 and earlier, so none is from today.
    expect(result.current.data).toEqual({ total: 42, today: 0, warnings: 14, denied: 7 });
  });
});

describe('useSystemLog', () => {
  it('loads one log by id and stays idle without one', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() => useSystemLog(42));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.module).toBe('faqs');

    const idle = renderHookWithQuery(() => useSystemLog(null));
    expect(idle.result.current.fetchStatus).toBe('idle');
  });

  it('reports a missing log and a missing view permission', async () => {
    signInAs(mockUsers.admin);
    const missing = renderHookWithQuery(() => useSystemLog(999_999));
    await waitFor(() => expect(missing.result.current.isError).toBe(true));
    expect(missing.result.current.error?.status).toBe(404);

    signInAs(mockUsers.logViewer);
    const denied = renderHookWithQuery(() => useSystemLog(42));
    await waitFor(() => expect(denied.result.current.isError).toBe(true));
    expect(denied.result.current.error?.status).toBe(403);
  });
});

describe('useSystemLogUserOptions', () => {
  it('searches accounts for the user filter', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() => useSystemLogUserOptions('asha'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toContainEqual({
      id: 1,
      label: 'Asha Admin',
      detail: 'admin@example.com',
    });
  });
});
