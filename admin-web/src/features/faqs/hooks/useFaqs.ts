import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import type { EntityId } from '@/types/common.types';

import { faqService } from '../services/faqService';
import type { CreateFaqRequest, FaqFilters, FaqStatus, UpdateFaqRequest } from '../types/faq.types';

export const faqKeys = {
  all: ['faqs'] as const,
  lists: () => [...faqKeys.all, 'list'] as const,
  list: (filters: FaqFilters) => [...faqKeys.lists(), filters] as const,
  counts: () => [...faqKeys.all, 'counts'] as const,
  nextSortOrder: () => [...faqKeys.all, 'next-sort-order'] as const,
  details: () => [...faqKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...faqKeys.details(), id] as const,
  // Outside `all`: configuration, not changed by FAQ writes.
  categories: () => ['faq-categories'] as const,
};

interface EnabledOption {
  enabled?: boolean;
}

/** A page of FAQs. The previous page stays visible while the next one loads. */
export function useFaqs(filters: FaqFilters, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: faqKeys.list(filters),
    queryFn: ({ signal }) => faqService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Totals for the overview cards; independent of the list filters. */
export function useFaqCounts({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: faqKeys.counts(),
    queryFn: ({ signal }) => faqService.counts(signal),
    enabled,
  });
}

/** One FAQ with its answer; `null` loads nothing. */
export function useFaq(id: EntityId | null, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: faqKeys.detail(id ?? 0),
    queryFn: ({ signal }) => faqService.get(id ?? 0, signal),
    enabled: enabled && id !== null,
  });
}

/** Suggested display order for a new FAQ; only a suggestion, so a failure is not retried. */
export function useNextFaqSortOrder({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: faqKeys.nextSortOrder(),
    queryFn: ({ signal }) => faqService.nextSortOrder(signal),
    retry: false,
    enabled,
  });
}

/** Categories come from server configuration and change only on a restart: cached for 10 minutes. */
export function useFaqCategories({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: faqKeys.categories(),
    queryFn: ({ signal }) => faqService.categories(signal),
    staleTime: 10 * 60_000,
    enabled,
  });
}

// Every write can change rows, details, counts and the next display order.
const INVALIDATE_ALL = { invalidates: [faqKeys.all] };

/** The form shows errors inline, so the global error toast is suppressed. */
export function useCreateFaq() {
  return useMutation({
    mutationFn: (request: CreateFaqRequest) => faqService.create(request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true },
  });
}

export function useUpdateFaq() {
  return useMutation({
    mutationFn: ({ id, request }: { id: EntityId; request: UpdateFaqRequest }) =>
      faqService.update(id, request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true },
  });
}

/**
 * Publish or unpublish (`PATCH` with `status` only). Bulk changes call this once per FAQ and report
 * the outcome themselves, so they pass `quiet` to skip the per-FAQ toast and error.
 */
export function useChangeFaqStatus({ quiet = false } = {}) {
  return useMutation({
    mutationFn: ({ id, status }: { id: EntityId; status: FaqStatus }) =>
      faqService.update(id, { status }),
    meta: {
      ...INVALIDATE_ALL,
      suppressGlobalError: quiet,
      successMessage: quiet ? undefined : 'FAQ status updated.',
    },
  });
}

export function useDeleteFaq({ quiet = false } = {}) {
  return useMutation({
    mutationFn: (id: EntityId) => faqService.remove(id),
    meta: {
      ...INVALIDATE_ALL,
      suppressGlobalError: quiet,
      successMessage: quiet ? undefined : 'FAQ deleted.',
    },
  });
}
