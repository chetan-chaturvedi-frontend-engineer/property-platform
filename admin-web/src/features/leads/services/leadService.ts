import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';
import type { EntityId } from '@/types/common.types';

import type {
  AmenityOption,
  AssigneeOption,
  AssignLeadRequest,
  CreateLeadRequest,
  Lead,
  LeadFilters,
  LeadStats,
  LeadSummary,
  UpdateLeadRequest,
} from '../types/lead.types';

/** Drops empty filter values so they are not sent as `status=`. */
function toParams(filters: object): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

const ASSIGNEE_PAGE_SIZE = 20;

export const leadService = {
  async list(filters: LeadFilters, signal?: AbortSignal): Promise<PageResponse<LeadSummary>> {
    const { data } = await apiClient.get<PageResponse<LeadSummary>>(API_ENDPOINTS.leads.list, {
      params: toParams(filters),
      signal,
    });
    return data;
  },

  async stats(signal?: AbortSignal): Promise<LeadStats> {
    const { data } = await apiClient.get<LeadStats>(API_ENDPOINTS.leads.stats, { signal });
    return data;
  },

  async get(id: EntityId, signal?: AbortSignal): Promise<Lead> {
    const { data } = await apiClient.get<Lead>(API_ENDPOINTS.leads.detail(id), { signal });
    return data;
  },

  async create(request: CreateLeadRequest): Promise<Lead> {
    const { data } = await apiClient.post<Lead>(API_ENDPOINTS.leads.list, request);
    return data;
  },

  async update(id: EntityId, request: UpdateLeadRequest): Promise<Lead> {
    const { data } = await apiClient.patch<Lead>(API_ENDPOINTS.leads.detail(id), request);
    return data;
  },

  async assign(id: EntityId, request: AssignLeadRequest): Promise<Lead> {
    const { data } = await apiClient.patch<Lead>(API_ENDPOINTS.leads.assign(id), request);
    return data;
  },

  async remove(id: EntityId): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.leads.detail(id));
  },

  /**
   * Active accounts matching the search, from the user management API (needs `USER_LIST`). The backend
   * still decides who may be assigned and rejects anyone whose role cannot work on the lead.
   */
  async assignees(search: string, signal?: AbortSignal): Promise<AssigneeOption[]> {
    const { data } = await apiClient.get<PageResponse<AssigneeOption>>(API_ENDPOINTS.users.list, {
      params: toParams({
        search,
        status: 'active',
        size: ASSIGNEE_PAGE_SIZE,
        sort: 'fullName,asc',
      }),
      signal,
    });
    return data.content.map(({ id, fullName, email }) => ({ id, fullName, email }));
  },

  /** The amenity catalog leads pick slugs from (needs `PROPERTY_VIEW_ANY`). */
  async amenities(signal?: AbortSignal): Promise<AmenityOption[]> {
    const { data } = await apiClient.get<AmenityOption[]>(API_ENDPOINTS.properties.amenities, {
      signal,
    });
    return data.map(({ id, name, slug }) => ({ id, name, slug }));
  },
};
