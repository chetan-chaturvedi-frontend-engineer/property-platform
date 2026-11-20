import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';
import type { EntityId } from '@/types/common.types';

import {
  type CreatePlanRequest,
  PLAN_STATUSES,
  type PlanCounts,
  type PlanFilters,
  type PlanStatus,
  type SubscriptionPlan,
  type UpdatePlanRequest,
} from '../types/subscriptionPlan.types';

/** Drops empty filter values so they are not sent as `status=`. */
function toParams(filters: object): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

/** The API caps page size at 100. */
export const MAX_PAGE_SIZE = 100;

export const subscriptionPlanService = {
  async list(filters: PlanFilters, signal?: AbortSignal): Promise<PageResponse<SubscriptionPlan>> {
    const { data } = await apiClient.get<PageResponse<SubscriptionPlan>>(
      API_ENDPOINTS.subscriptionPlans.list,
      { params: toParams(filters), signal },
    );
    return data;
  },

  /** Every plan matching the filters, page by page (100 per request), up to `limit` rows. */
  async listAll(
    filters: Omit<PlanFilters, 'page' | 'size'>,
    { limit, signal }: { limit: number; signal?: AbortSignal },
  ): Promise<{ rows: SubscriptionPlan[]; total: number }> {
    const rows: SubscriptionPlan[] = [];
    let page = 0;
    let total = 0;
    do {
      const result = await subscriptionPlanService.list(
        { ...filters, page, size: MAX_PAGE_SIZE },
        signal,
      );
      total = result.totalElements;
      rows.push(...result.content);
      page += 1;
      if (page >= result.totalPages) break;
    } while (rows.length < limit);
    return { rows: rows.slice(0, limit), total };
  },

  /**
   * Overview counts. There is no stats endpoint, so each count is the total of a one-row list
   * request (all, each status, popular), sent in parallel.
   */
  async counts(signal?: AbortSignal): Promise<PlanCounts> {
    const totalOf = async (filters: PlanFilters) =>
      (await subscriptionPlanService.list({ ...filters, page: 0, size: 1 }, signal)).totalElements;
    const [total, popular, ...statusTotals] = await Promise.all([
      totalOf({}),
      totalOf({ popular: true }),
      ...PLAN_STATUSES.map((status) => totalOf({ status })),
    ]);
    const byStatus: Record<PlanStatus, number> = { active: 0, draft: 0, inactive: 0 };
    PLAN_STATUSES.forEach((status, index) => {
      byStatus[status] = statusTotals[index] ?? 0;
    });
    return { total, popular, byStatus };
  },

  async get(id: EntityId, signal?: AbortSignal): Promise<SubscriptionPlan> {
    const { data } = await apiClient.get<SubscriptionPlan>(
      API_ENDPOINTS.subscriptionPlans.detail(id),
      { signal },
    );
    return data;
  },

  async create(request: CreatePlanRequest): Promise<SubscriptionPlan> {
    const { data } = await apiClient.post<SubscriptionPlan>(
      API_ENDPOINTS.subscriptionPlans.list,
      request,
    );
    return data;
  },

  async update(id: EntityId, request: UpdatePlanRequest): Promise<SubscriptionPlan> {
    const { data } = await apiClient.patch<SubscriptionPlan>(
      API_ENDPOINTS.subscriptionPlans.detail(id),
      request,
    );
    return data;
  },

  async changeStatus(id: EntityId, status: PlanStatus): Promise<SubscriptionPlan> {
    const { data } = await apiClient.patch<SubscriptionPlan>(
      API_ENDPOINTS.subscriptionPlans.status(id),
      { status },
    );
    return data;
  },
};
