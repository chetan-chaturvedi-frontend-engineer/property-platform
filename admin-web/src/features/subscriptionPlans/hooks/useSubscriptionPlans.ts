import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import type { EntityId } from '@/types/common.types';

import { subscriptionPlanService } from '../services/subscriptionPlanService';
import type {
  CreatePlanRequest,
  PlanFilters,
  PlanStatus,
  UpdatePlanRequest,
} from '../types/subscriptionPlan.types';

export const planKeys = {
  all: ['subscription-plans'] as const,
  lists: () => [...planKeys.all, 'list'] as const,
  list: (filters: PlanFilters) => [...planKeys.lists(), filters] as const,
  counts: () => [...planKeys.all, 'counts'] as const,
  details: () => [...planKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...planKeys.details(), id] as const,
};

interface EnabledOption {
  enabled?: boolean;
}

/** A page of plans. The previous page stays visible while the next one loads. */
export function useSubscriptionPlans(filters: PlanFilters, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: planKeys.list(filters),
    queryFn: ({ signal }) => subscriptionPlanService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Totals for the overview cards and tabs; independent of the list filters. */
export function usePlanCounts({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: planKeys.counts(),
    queryFn: ({ signal }) => subscriptionPlanService.counts(signal),
    enabled,
  });
}

export function useSubscriptionPlan(id: EntityId | null, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: planKeys.detail(id ?? 0),
    queryFn: ({ signal }) => subscriptionPlanService.get(id ?? 0, signal),
    enabled: enabled && id !== null,
  });
}

// Every write can change counts as well as rows, so the whole key space is refreshed.
const INVALIDATE_ALL = { invalidates: [planKeys.all] };

/** Creates a plan; also used to duplicate one, with its own success message. */
export function useCreatePlan({ successMessage = 'Plan created.' } = {}) {
  return useMutation({
    mutationFn: (request: CreatePlanRequest) => subscriptionPlanService.create(request),
    // The form shows the error inline.
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage },
  });
}

export function useUpdatePlan() {
  return useMutation({
    mutationFn: ({ id, request }: { id: EntityId; request: UpdatePlanRequest }) =>
      subscriptionPlanService.update(id, request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage: 'Plan updated.' },
  });
}

/**
 * Status changes. Bulk changes call this once per plan and report the outcome themselves, so they
 * pass `quiet` to skip the per-plan toast and error.
 */
export function useChangePlanStatus({ quiet = false } = {}) {
  return useMutation({
    mutationFn: ({ id, status }: { id: EntityId; status: PlanStatus }) =>
      subscriptionPlanService.changeStatus(id, status),
    meta: {
      ...INVALIDATE_ALL,
      suppressGlobalError: quiet,
      successMessage: quiet ? undefined : 'Plan status updated.',
    },
  });
}
