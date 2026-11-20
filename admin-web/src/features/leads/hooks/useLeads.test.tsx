import { act, waitFor } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import {
  leadKeys,
  useAssigneeOptions,
  useAssignLead,
  useCreateLead,
  useDeleteLead,
  useLead,
  useLeads,
  useLeadStats,
  useUpdateLead,
} from './useLeads';

/** The mock has 28 leads, ids 300 down to 273, statuses and sources in a fixed cycle. */
const TOTAL = 28;

function appClient() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return client;
}

describe('useLeads', () => {
  it('loads a page of leads and caches it under the filter key', async () => {
    signInAs(mockUsers.admin);
    const filters = { page: 0, size: 5 };

    const { result, queryClient } = renderHookWithQuery(() => useLeads(filters));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.content).toHaveLength(5);
    expect(result.current.data?.totalElements).toBe(TOTAL);
    expect(result.current.data?.content[0]?.id).toBe(300);
    expect(queryClient.getQueryData(leadKeys.list(filters))).toEqual(result.current.data);
  });

  it('passes status, source, search and sort to the API', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() =>
      useLeads({ page: 0, size: 100, status: 'new', sort: 'leadName,asc' }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const rows = result.current.data?.content ?? [];
    expect(rows).toHaveLength(4);
    expect(rows.every((lead) => lead.status === 'new')).toBe(true);
    const names = rows.map((lead) => lead.leadName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    const search = renderHookWithQuery(() =>
      useLeads({ page: 0, search: 'meera', source: 'website' }),
    );
    await waitFor(() => expect(search.result.current.isSuccess).toBe(true));
    expect(search.result.current.data?.content.map((lead) => lead.id)).toEqual([293, 279]);
  });

  it('loads counts per status and source', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() => useLeadStats());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(TOTAL);
    expect(result.current.data?.byStatus.new).toBe(4);
    expect(result.current.data?.byStatus.lost).toBe(3);
    expect(result.current.data?.bySource.website).toBe(4);
  });

  it('loads one lead with its full details, and reports a missing one as 404', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() => useLead(300));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.leadName).toBe('Rahul Sharma');
    expect(result.current.data?.amenities).toEqual(['gymnasium', 'swimming-pool']);

    const missing = renderHookWithQuery(() => useLead(9999), appClient());
    await waitFor(() => expect(missing.result.current.isError).toBe(true));
    expect(missing.result.current.error?.status).toBe(404);
  });

  it('does not fetch without an id', () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useLead(null));
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('creates a lead and refreshes lists and counts', async () => {
    signInAs(mockUsers.admin);
    // The app's client: its MutationCache applies `meta.invalidates`.
    const { result } = renderHookWithQuery(
      () => ({ stats: useLeadStats(), create: useCreateLead() }),
      appClient(),
    );
    await waitFor(() => expect(result.current.stats.isSuccess).toBe(true));

    await act(async () => {
      await result.current.create.mutateAsync({
        leadName: 'Ravi Kumar',
        phone: '98765 00000',
        purpose: 'buy',
      });
    });

    expect(mockDb.leads()[0]).toMatchObject({ leadName: 'Ravi Kumar', phone: '+919876500000' });
    await waitFor(() => expect(result.current.stats.data?.total).toBe(TOTAL + 1));
  });

  it('rejects invalid input with field errors', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useCreateLead(), appClient());

    await act(async () => {
      await expect(
        result.current.mutateAsync({ leadName: 'X', phone: '12', purpose: 'buy' }),
      ).rejects.toMatchObject({
        status: 400,
        fieldErrors: { phone: 'must be a valid phone number' },
      });
    });
  });

  it('updates only the fields sent and enforces the converted rule', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useUpdateLead(), appClient());

    await act(async () => {
      await result.current.mutateAsync({ id: 300, request: { priority: 'urgent' } });
    });
    expect(mockDb.findLead(300)).toMatchObject({ priority: 'urgent', leadName: 'Rahul Sharma' });

    // Lead 294 is converted.
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 294, request: { status: 'new' } }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  it('assigns to an eligible user and rejects others', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useAssignLead(), appClient());

    await act(async () => {
      await result.current.mutateAsync({ id: 298, assignedTo: 4 });
    });
    expect(mockDb.findLead(298)?.assignedTo).toEqual({ id: 4, fullName: 'Sam Super' });

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 298, assignedTo: 3 })).rejects.toMatchObject({
        fieldErrors: { assignedTo: 'must be an active user who can work on this lead' },
      });
    });
  });

  it('deletes a lead and drops its cached details', async () => {
    signInAs(mockUsers.admin);
    const queryClient = appClient();
    const detail = renderHookWithQuery(() => useLead(300), queryClient);
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    detail.unmount();

    const { result } = renderHookWithQuery(() => useDeleteLead(), queryClient);
    await act(async () => {
      await result.current.mutateAsync(300);
    });

    expect(mockDb.findLead(300)).toBeUndefined();
    expect(queryClient.getQueryData(leadKeys.detail(300))).toBeUndefined();
  });

  it('searches active users as assignee candidates', async () => {
    signInAs(mockUsers.admin);

    const { result } = renderHookWithQuery(() => useAssigneeOptions('asha'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { id: 1, fullName: 'Asha Admin', email: 'admin@example.com' },
    ]);
  });

  it('surfaces server errors from the list', async () => {
    signInAs(mockUsers.admin);
    server.use(http.get(apiPath('/admin/leads'), () => problem(500, 'internal_error', 'Boom')));

    const { result } = renderHookWithQuery(() => useLeads({ page: 0 }), appClient());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(500);
  });
});
