import { act, waitFor } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import { addDays, propertyNow } from '../utils/siteVisitDisplay';

import {
  siteVisitKeys,
  useAssignSiteVisit,
  useChangeSiteVisitStatus,
  useCreateSiteVisit,
  useDeleteSiteVisit,
  useSiteVisit,
  useSiteVisitCalendar,
  useSiteVisits,
  useSiteVisitStats,
  useSubmitSiteVisitReport,
  useUpdateSiteVisit,
  useUserOptions,
} from './useSiteVisits';

/** 36 visits, ids 200 down to 165, six of each status (see siteVisitMockData). */
const TOTAL = 36;

function appClient() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return client;
}

describe('site visit queries', () => {
  it('loads a page and caches it under the filter key', async () => {
    signInAs(mockUsers.admin);
    const filters = { page: 0, size: 5 };
    const { result, queryClient } = renderHookWithQuery(() => useSiteVisits(filters));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.content).toHaveLength(5);
    expect(result.current.data?.totalElements).toBe(TOTAL);
    expect(queryClient.getQueryData(siteVisitKeys.list(filters))).toEqual(result.current.data);
  });

  it('passes status, type, search, date range and sort to the API', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() =>
      useSiteVisits({ page: 0, size: 100, status: 'completed', sort: 'visitDate,asc' }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const rows = result.current.data?.content ?? [];
    expect(rows).toHaveLength(6);
    expect(rows.every((visit) => visit.status === 'completed')).toBe(true);
    const dates = rows.map((visit) => visit.visitDate);
    expect(dates).toEqual([...dates].sort());

    const today = propertyNow().date;
    const future = renderHookWithQuery(() =>
      useSiteVisits({
        page: 0,
        size: 100,
        visitDateFrom: addDays(today, 1),
        visitType: 'site_visit',
      }),
    );
    await waitFor(() => expect(future.result.current.isSuccess).toBe(true));
    const upcoming = future.result.current.data?.content ?? [];
    expect(upcoming.length).toBeGreaterThan(0);
    expect(
      upcoming.every((visit) => visit.visitDate > today && visit.visitType === 'site_visit'),
    ).toBe(true);

    const search = renderHookWithQuery(() => useSiteVisits({ search: 'SV-100200' }));
    await waitFor(() => expect(search.result.current.isSuccess).toBe(true));
    expect(search.result.current.data?.content.map((visit) => visit.id)).toEqual([200]);
  });

  it('loads counts per status and type', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useSiteVisitStats());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(TOTAL);
    expect(result.current.data?.byStatus).toEqual({
      scheduled: 6,
      confirmed: 6,
      rescheduled: 6,
      completed: 6,
      cancelled: 6,
      no_show: 6,
    });
    expect(result.current.data?.byVisitType).toEqual({
      site_visit: 25,
      virtual_visit: 7,
      revisit: 4,
    });
  });

  it('reads every page of a date range for the calendar', async () => {
    signInAs(mockUsers.admin);
    const today = propertyNow().date;
    const { result } = renderHookWithQuery(() =>
      useSiteVisitCalendar(addDays(today, -30), addDays(today, 30), {}),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.rows).toHaveLength(TOTAL);
    expect(result.current.data?.total).toBe(TOTAL);
  });

  it('loads one visit and reports a missing one as 404', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useSiteVisit(200));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.visitCode).toBe('SV-100200');

    const missing = renderHookWithQuery(() => useSiteVisit(9999));
    await waitFor(() => expect(missing.result.current.isError).toBe(true));
    expect(missing.result.current.error?.status).toBe(404);
  });

  it('needs the list permission', async () => {
    signInAs(mockUsers.leadViewer);
    const { result } = renderHookWithQuery(() => useSiteVisitStats());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(403);
  });

  it('searches active users for the agent picker', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useUserOptions('asha'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toContainEqual({
      id: 1,
      label: 'Asha Admin',
      detail: 'admin@example.com',
    });
  });
});

describe('site visit mutations', () => {
  it('creates a visit and refreshes lists and counts', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(
      () => ({ stats: useSiteVisitStats(), create: useCreateSiteVisit() }),
      appClient(),
    );
    await waitFor(() => expect(result.current.stats.isSuccess).toBe(true));

    await act(async () => {
      await result.current.create.mutateAsync({
        propertyId: 2,
        visitDate: addDays(propertyNow().date, 1),
        visitTime: '11:00',
        name: 'Ravi Kumar',
        mobile: '9876543210',
        assignId: 1,
      });
    });

    expect(mockDb.siteVisits()[0]).toMatchObject({
      status: 'scheduled',
      mobile: '+919876543210',
      assignee: { id: 1 },
      scheduledBy: { id: 1 },
    });
    await waitFor(() => expect(result.current.stats.data?.total).toBe(TOTAL + 1));
  });

  it('rejects a past visit date with a field error', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useCreateSiteVisit(), appClient());

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          propertyId: 2,
          visitDate: addDays(propertyNow().date, -1),
          visitTime: '11:00',
          name: 'Ravi',
          mobile: '9876543210',
        }),
      ).rejects.toMatchObject({
        status: 400,
        fieldErrors: { visitDate: 'The visit date cannot be in the past' },
      });
    });
  });

  it('marks a moved visit as rescheduled and refuses detail edits on final visits', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useUpdateSiteVisit(), appClient());

    await act(async () => {
      const moved = await result.current.mutateAsync({ id: 200, request: { visitTime: '18:00' } });
      expect(moved.status).toBe('rescheduled');
    });
    // Visit 197 is completed: follow-up fields still change, visit details do not.
    await act(async () => {
      const followUp = await result.current.mutateAsync({
        id: 197,
        request: { followUpNote: 'Call back' },
      });
      expect(followUp.followUpNote).toBe('Call back');
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 197, request: { name: 'Someone else' } }),
      ).rejects.toMatchObject({ status: 409, code: 'site_visit_not_editable' });
    });
  });

  it('changes status within the lifecycle only', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useChangeSiteVisitStatus(), appClient());

    await act(async () => {
      const confirmed = await result.current.mutateAsync({
        id: 200,
        request: { status: 'confirmed' },
      });
      expect(confirmed.status).toBe('confirmed');
    });
    // A future visit cannot be completed yet; a cancelled one (196) is final.
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 200, request: { status: 'completed' } }),
      ).rejects.toMatchObject({ status: 409, code: 'site_visit_not_due' });
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 196, request: { status: 'confirmed' } }),
      ).rejects.toMatchObject({ status: 409, code: 'site_visit_invalid_status_transition' });
    });
  });

  it('assigns, reports and deletes', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(
      () => ({
        assign: useAssignSiteVisit(),
        report: useSubmitSiteVisitReport(),
        remove: useDeleteSiteVisit(),
      }),
      appClient(),
    );

    await act(async () => {
      const assigned = await result.current.assign.mutateAsync({ id: 200, assignId: 4 });
      expect(assigned.assignee).toEqual({ id: 4, fullName: 'Sam Super' });
    });
    // The app user (3) has no role that can work on site visits.
    await act(async () => {
      await expect(
        result.current.assign.mutateAsync({ id: 200, assignId: 3 }),
      ).rejects.toMatchObject({
        status: 400,
        fieldErrors: { assignId: 'must be an active user who can work on site visits' },
      });
    });
    await act(async () => {
      const reported = await result.current.report.mutateAsync({
        id: 197,
        request: { interest: 'medium', rating: 3 },
      });
      expect(reported.report).toMatchObject({ interest: 'medium', rating: 3 });
    });
    await act(async () => {
      await result.current.remove.mutateAsync(200);
    });
    expect(mockDb.findSiteVisit(200)).toBeUndefined();
  });

  it('surfaces server errors from writes', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.delete(apiPath('/admin/site-visits/:id'), () =>
        problem(403, 'site_visit_action_forbidden', 'Not allowed'),
      ),
    );
    const { result } = renderHookWithQuery(() => useDeleteSiteVisit(), appClient());

    await act(async () => {
      await expect(result.current.mutateAsync(200)).rejects.toMatchObject({ status: 403 });
    });
    expect(mockDb.findSiteVisit(200)).toBeDefined();
  });
});
