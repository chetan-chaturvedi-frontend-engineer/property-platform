import { act, waitFor } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderHookWithQuery, signInAs } from '@/tests/utils/testUtils';

import {
  planKeys,
  useChangePlanStatus,
  useCreatePlan,
  usePlanCounts,
  useSubscriptionPlan,
  useSubscriptionPlans,
  useUpdatePlan,
} from './useSubscriptionPlans';

/** 14 plans: 8 active, 3 draft, 3 inactive, 2 popular (see subscriptionPlanMockData). */
const TOTAL = 14;

function appClient() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return client;
}

describe('subscription plan queries', () => {
  it('loads a page in display order and caches it under the filter key', async () => {
    signInAs(mockUsers.admin);
    const filters = { page: 0, size: 5 };
    const { result, queryClient } = renderHookWithQuery(() => useSubscriptionPlans(filters));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalElements).toBe(TOTAL);
    expect(result.current.data?.content.map((plan) => plan.title)).toEqual([
      'Free',
      'Starter',
      'Silver',
      'Gold',
      'Platinum',
    ]);
    expect(queryClient.getQueryData(planKeys.list(filters))).toEqual(result.current.data);
  });

  it('passes search, status, interval, popular, price range and sort to the API', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() =>
      useSubscriptionPlans({
        page: 0,
        size: 100,
        status: 'active',
        billingInterval: 'month',
        minPrice: 400,
        maxPrice: 5000,
        sort: 'price,desc',
      }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.content.map((plan) => plan.title)).toEqual([
      'Builder Pro',
      'Gold',
      'Silver',
      'Starter',
    ]);

    const popular = renderHookWithQuery(() =>
      useSubscriptionPlans({ page: 0, size: 100, popular: true, search: 'GOLD' }),
    );
    await waitFor(() => expect(popular.result.current.isSuccess).toBe(true));
    expect(popular.result.current.data?.content.map((plan) => plan.slug)).toEqual(['gold']);
  });

  it('derives the overview counts from the list totals', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => usePlanCounts());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      total: TOTAL,
      popular: 2,
      byStatus: { active: 8, draft: 3, inactive: 3 },
    });
  });

  it('loads one plan and surfaces a 404 as an ApiError', async () => {
    signInAs(mockUsers.admin);
    const found = renderHookWithQuery(() => useSubscriptionPlan(4));
    await waitFor(() => expect(found.result.current.isSuccess).toBe(true));
    expect(found.result.current.data?.title).toBe('Gold');

    const missing = renderHookWithQuery(() => useSubscriptionPlan(9999));
    await waitFor(() => expect(missing.result.current.isError).toBe(true));
    expect(missing.result.current.error?.code).toBe('subscription_plan_not_found');
  });

  it('does not request details without an id', () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useSubscriptionPlan(null));
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('rejects list calls without the list permission', async () => {
    signInAs(mockUsers.manager);
    const { result } = renderHookWithQuery(() => useSubscriptionPlans({ page: 0, size: 5 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(403);
  });
});

describe('subscription plan mutations', () => {
  it('creates a plan with a generated slug and refreshes the counts', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(
      () => ({ counts: usePlanCounts(), create: useCreatePlan() }),
      appClient(),
    );
    await waitFor(() => expect(result.current.counts.isSuccess).toBe(true));

    let id = 0;
    await act(async () => {
      const created = await result.current.create.mutateAsync({
        title: 'Gold',
        price: 3999,
        billingInterval: 'month',
        billingIntervalCount: 3,
      });
      id = created.id;
      expect(created.slug).toBe('gold-2');
      expect(created.status).toBe('draft');
    });
    expect(mockDb.findSubscriptionPlan(id)?.price).toBe(3999);
    await waitFor(() => expect(result.current.counts.data?.byStatus.draft).toBe(4));
  });

  it('rejects a taken slug with a 409', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useCreatePlan(), appClient());
    await act(async () => {
      await expect(
        result.current.mutateAsync({ title: 'Another', price: 1, slug: 'gold' }),
      ).rejects.toMatchObject({ status: 409, code: 'subscription_plan_slug_taken' });
    });
  });

  it('updates only the sent fields and clears the property limit with null', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useUpdatePlan(), appClient());
    await act(async () => {
      await result.current.mutateAsync({ id: 4, request: { noOfProperties: null, trialDays: 7 } });
    });
    const plan = mockDb.findSubscriptionPlan(4);
    expect(plan?.noOfProperties).toBeNull();
    expect(plan?.trialDays).toBe(7);
    expect(plan?.title).toBe('Gold');
  });

  it('changes the status', async () => {
    signInAs(mockUsers.admin);
    const { result } = renderHookWithQuery(() => useChangePlanStatus(), appClient());
    await act(async () => {
      await result.current.mutateAsync({ id: 1, status: 'inactive' });
    });
    expect(mockDb.findSubscriptionPlan(1)?.status).toBe('inactive');
  });

  it('surfaces server validation errors', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.post(apiPath('/admin/subscription-plans'), () =>
        problem(400, 'validation_failed', 'Validation failed', {
          errors: { currency: 'must be a valid ISO 4217 currency code' },
        }),
      ),
    );
    const { result } = renderHookWithQuery(() => useCreatePlan(), appClient());
    await act(async () => {
      await expect(
        result.current.mutateAsync({ title: 'X', price: 1, currency: 'XYZ' }),
      ).rejects.toMatchObject({
        fieldErrors: { currency: 'must be a valid ISO 4217 currency code' },
      });
    });
  });
});
