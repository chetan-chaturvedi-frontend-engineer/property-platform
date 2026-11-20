import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { EntityId } from '@/types/common.types';

import { leadService } from '../services/leadService';
import type { CreateLeadRequest, LeadFilters, UpdateLeadRequest } from '../types/lead.types';

export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  stats: () => [...leadKeys.all, 'stats'] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...leadKeys.details(), id] as const,
  assignees: (search: string) => ['lead-assignees', search] as const,
  amenities: () => ['lead-amenities'] as const,
};

interface EnabledOption {
  enabled?: boolean;
}

/** A page of leads. The previous page stays visible while the next one loads. */
export function useLeads(filters: LeadFilters, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: ({ signal }) => leadService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useLeadStats({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: leadKeys.stats(),
    queryFn: ({ signal }) => leadService.stats(signal),
    enabled,
  });
}

export function useLead(id: EntityId | null, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: leadKeys.detail(id ?? 0),
    queryFn: ({ signal }) => leadService.get(id ?? 0, signal),
    enabled: enabled && id !== null,
  });
}

/** Assignee candidates for a (debounced) search term. */
export function useAssigneeOptions(search: string, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: leadKeys.assignees(search),
    queryFn: ({ signal }) => leadService.assignees(search, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  });
}

/** The amenity catalog rarely changes, so it is cached longer. */
export function useLeadAmenities({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: leadKeys.amenities(),
    queryFn: ({ signal }) => leadService.amenities(signal),
    staleTime: 10 * 60_000,
    enabled,
  });
}

// Every write changes counts as well as rows, so the whole `leads` key space is refreshed.
const INVALIDATE_ALL = { invalidates: [leadKeys.all] };

export function useCreateLead() {
  return useMutation({
    mutationFn: (request: CreateLeadRequest) => leadService.create(request),
    // The form shows the error inline.
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage: 'Lead created.' },
  });
}

export function useUpdateLead({ successMessage = 'Lead updated.' } = {}) {
  return useMutation({
    mutationFn: ({ id, request }: { id: EntityId; request: UpdateLeadRequest }) =>
      leadService.update(id, request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage },
  });
}

export function useAssignLead() {
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: EntityId; assignedTo: EntityId | null }) =>
      leadService.assign(id, { assignedTo }),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage: 'Assignment saved.' },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: EntityId) => leadService.remove(id),
    // The deleted lead's details would refetch into a 404, so they are dropped, not invalidated.
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: leadKeys.detail(id) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: leadKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: leadKeys.stats() }),
      ]);
    },
    meta: { successMessage: 'Lead deleted.' },
  });
}
