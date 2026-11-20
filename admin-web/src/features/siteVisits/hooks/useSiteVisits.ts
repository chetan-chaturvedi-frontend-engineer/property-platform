import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { EntityId } from '@/types/common.types';

import { siteVisitService } from '../services/siteVisitService';
import type {
  CreateSiteVisitRequest,
  SiteVisitFilters,
  SiteVisitReportRequest,
  SiteVisitStatusRequest,
  UpdateSiteVisitRequest,
} from '../types/siteVisit.types';

export const siteVisitKeys = {
  all: ['site-visits'] as const,
  lists: () => [...siteVisitKeys.all, 'list'] as const,
  list: (filters: SiteVisitFilters) => [...siteVisitKeys.lists(), filters] as const,
  calendar: (from: string, to: string, filters: SiteVisitFilters) =>
    [...siteVisitKeys.lists(), 'calendar', from, to, filters] as const,
  stats: () => [...siteVisitKeys.all, 'stats'] as const,
  details: () => [...siteVisitKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...siteVisitKeys.details(), id] as const,
  users: (search: string) => ['site-visit-users', search] as const,
  properties: (search: string) => ['site-visit-properties', search] as const,
  leads: (search: string) => ['site-visit-leads', search] as const,
};

interface EnabledOption {
  enabled?: boolean;
}

/** Visits shown in one calendar month; more are reported as a truncation notice. */
export const CALENDAR_LIMIT = 500;

/** A page of visits. The previous page stays visible while the next one loads. */
export function useSiteVisits(filters: SiteVisitFilters, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: siteVisitKeys.list(filters),
    queryFn: ({ signal }) => siteVisitService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Every visit between two dates (inclusive), with the other list filters applied. */
export function useSiteVisitCalendar(
  from: string,
  to: string,
  filters: Omit<SiteVisitFilters, 'page' | 'size' | 'sort' | 'visitDateFrom' | 'visitDateTo'>,
  { enabled = true }: EnabledOption = {},
) {
  return useQuery({
    queryKey: siteVisitKeys.calendar(from, to, filters),
    queryFn: ({ signal }) =>
      siteVisitService.listAll(
        { ...filters, visitDateFrom: from, visitDateTo: to, sort: 'visitDate,asc' },
        { limit: CALENDAR_LIMIT, signal },
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useSiteVisitStats({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: siteVisitKeys.stats(),
    queryFn: ({ signal }) => siteVisitService.stats(signal),
    enabled,
  });
}

export function useSiteVisit(id: EntityId | null, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: siteVisitKeys.detail(id ?? 0),
    queryFn: ({ signal }) => siteVisitService.get(id ?? 0, signal),
    enabled: enabled && id !== null,
  });
}

/** Picker options for a (debounced) search term; cached briefly while the picker is open. */
export function useUserOptions(search: string, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: siteVisitKeys.users(search),
    queryFn: ({ signal }) => siteVisitService.users(search, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  });
}

export function usePropertyOptions(search: string, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: siteVisitKeys.properties(search),
    queryFn: ({ signal }) => siteVisitService.properties(search, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  });
}

export function useLeadOptions(search: string, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: siteVisitKeys.leads(search),
    queryFn: ({ signal }) => siteVisitService.leads(search, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  });
}

// Every write changes counts as well as rows, so the whole `site-visits` key space is refreshed.
const INVALIDATE_ALL = { invalidates: [siteVisitKeys.all] };

export function useCreateSiteVisit() {
  return useMutation({
    mutationFn: (request: CreateSiteVisitRequest) => siteVisitService.create(request),
    // The form shows the error inline.
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage: 'Site visit scheduled.' },
  });
}

export function useUpdateSiteVisit({ successMessage = 'Site visit updated.' } = {}) {
  return useMutation({
    mutationFn: ({ id, request }: { id: EntityId; request: UpdateSiteVisitRequest }) =>
      siteVisitService.update(id, request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage },
  });
}

/**
 * Status changes. Bulk updates call this once per visit and report the outcome themselves, so they
 * pass `quiet` to skip the per-visit toast.
 */
export function useChangeSiteVisitStatus({ quiet = false } = {}) {
  return useMutation({
    mutationFn: ({ id, request }: { id: EntityId; request: SiteVisitStatusRequest }) =>
      siteVisitService.changeStatus(id, request),
    meta: {
      ...INVALIDATE_ALL,
      suppressGlobalError: true,
      successMessage: quiet ? undefined : 'Status updated.',
    },
  });
}

export function useAssignSiteVisit() {
  return useMutation({
    mutationFn: ({ id, assignId }: { id: EntityId; assignId: EntityId | null }) =>
      siteVisitService.assign(id, assignId),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage: 'Assignment saved.' },
  });
}

export function useSubmitSiteVisitReport() {
  return useMutation({
    mutationFn: ({ id, request }: { id: EntityId; request: SiteVisitReportRequest }) =>
      siteVisitService.submitReport(id, request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage: 'Visit report saved.' },
  });
}

export function useDeleteSiteVisit({ quiet = false } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: EntityId) => siteVisitService.remove(id),
    // The deleted visit's details would refetch into a 404, so they are dropped, not invalidated.
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: siteVisitKeys.detail(id) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: siteVisitKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: siteVisitKeys.stats() }),
      ]);
    },
    meta: { suppressGlobalError: quiet, successMessage: quiet ? undefined : 'Site visit deleted.' },
  });
}
