import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';
import type { EntityId, Nullable } from '@/types/common.types';

import type {
  CreateSiteVisitRequest,
  LeadPickerOption,
  PickerOption,
  SiteVisit,
  SiteVisitFilters,
  SiteVisitReportRequest,
  SiteVisitStats,
  SiteVisitStatusRequest,
  SiteVisitSummary,
  UpdateSiteVisitRequest,
} from '../types/siteVisit.types';

/** Drops empty filter values so they are not sent as `status=`. */
function toParams(filters: object): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

const PICKER_PAGE_SIZE = 20;
/** The API caps page size at 100. */
export const MAX_PAGE_SIZE = 100;

/** The parts of other modules' list responses the pickers read. */
interface UserRow {
  id: EntityId;
  fullName: string;
  email: string;
}
interface PropertyRow {
  id: EntityId;
  projectName: string;
  city: Nullable<string>;
  locality: Nullable<string>;
}
interface LeadRow {
  id: EntityId;
  leadName: string;
  phone: string;
  email: Nullable<string>;
}

export const siteVisitService = {
  async list(
    filters: SiteVisitFilters,
    signal?: AbortSignal,
  ): Promise<PageResponse<SiteVisitSummary>> {
    const { data } = await apiClient.get<PageResponse<SiteVisitSummary>>(
      API_ENDPOINTS.siteVisits.list,
      { params: toParams(filters), signal },
    );
    return data;
  },

  /**
   * Every visit matching the filters, page by page (100 per request), up to `limit` rows. Used for
   * the calendar month and the CSV export; `onProgress` reports rows loaded so far.
   */
  async listAll(
    filters: Omit<SiteVisitFilters, 'page' | 'size'>,
    {
      limit,
      signal,
      onProgress,
    }: {
      limit: number;
      signal?: AbortSignal;
      onProgress?: (loaded: number, total: number) => void;
    },
  ): Promise<{ rows: SiteVisitSummary[]; total: number }> {
    const rows: SiteVisitSummary[] = [];
    let page = 0;
    let total = 0;
    do {
      const result = await siteVisitService.list({ ...filters, page, size: MAX_PAGE_SIZE }, signal);
      total = result.totalElements;
      rows.push(...result.content);
      onProgress?.(rows.length, total);
      page += 1;
      if (page >= result.totalPages) break;
    } while (rows.length < limit);
    return { rows: rows.slice(0, limit), total };
  },

  async stats(signal?: AbortSignal): Promise<SiteVisitStats> {
    const { data } = await apiClient.get<SiteVisitStats>(API_ENDPOINTS.siteVisits.stats, {
      signal,
    });
    return data;
  },

  async get(id: EntityId, signal?: AbortSignal): Promise<SiteVisit> {
    const { data } = await apiClient.get<SiteVisit>(API_ENDPOINTS.siteVisits.detail(id), {
      signal,
    });
    return data;
  },

  async create(request: CreateSiteVisitRequest): Promise<SiteVisit> {
    const { data } = await apiClient.post<SiteVisit>(API_ENDPOINTS.siteVisits.list, request);
    return data;
  },

  async update(id: EntityId, request: UpdateSiteVisitRequest): Promise<SiteVisit> {
    const { data } = await apiClient.patch<SiteVisit>(API_ENDPOINTS.siteVisits.detail(id), request);
    return data;
  },

  async changeStatus(id: EntityId, request: SiteVisitStatusRequest): Promise<SiteVisit> {
    const { data } = await apiClient.patch<SiteVisit>(API_ENDPOINTS.siteVisits.status(id), request);
    return data;
  },

  async assign(id: EntityId, assignId: EntityId | null): Promise<SiteVisit> {
    const { data } = await apiClient.patch<SiteVisit>(API_ENDPOINTS.siteVisits.assign(id), {
      assignId,
    });
    return data;
  },

  async submitReport(id: EntityId, request: SiteVisitReportRequest): Promise<SiteVisit> {
    const { data } = await apiClient.post<SiteVisit>(API_ENDPOINTS.siteVisits.report(id), request);
    return data;
  },

  async remove(id: EntityId): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.siteVisits.detail(id));
  },

  /**
   * Active accounts for the agent and visitor pickers (user management list, needs `USER_LIST`). The
   * backend still decides who may be assigned and answers 400 `assignId` for anyone else.
   */
  async users(search: string, signal?: AbortSignal): Promise<PickerOption[]> {
    const { data } = await apiClient.get<PageResponse<UserRow>>(API_ENDPOINTS.users.list, {
      params: toParams({ search, status: 'active', size: PICKER_PAGE_SIZE, sort: 'fullName,asc' }),
      signal,
    });
    return data.content.map((user) => ({ id: user.id, label: user.fullName, detail: user.email }));
  },

  /** Properties for the property picker and filter (needs `PROPERTY_LIST_ANY`). */
  async properties(search: string, signal?: AbortSignal): Promise<PickerOption[]> {
    const { data } = await apiClient.get<PageResponse<PropertyRow>>(API_ENDPOINTS.properties.list, {
      params: toParams({ search, size: PICKER_PAGE_SIZE, sort: 'projectName,asc' }),
      signal,
    });
    return data.content.map((property) => ({
      id: property.id,
      label: property.projectName,
      detail: [property.locality, property.city].filter(Boolean).join(', ') || undefined,
    }));
  },

  /** Leads to link a visit to (needs `LEAD_LIST_ANY`). */
  async leads(search: string, signal?: AbortSignal): Promise<LeadPickerOption[]> {
    const { data } = await apiClient.get<PageResponse<LeadRow>>(API_ENDPOINTS.leads.list, {
      params: toParams({ search, size: PICKER_PAGE_SIZE, sort: 'createdAt,desc' }),
      signal,
    });
    return data.content.map((lead) => ({
      id: lead.id,
      label: lead.leadName,
      detail: `LID-${lead.id} · ${lead.phone}`,
      phone: lead.phone,
      email: lead.email,
    }));
  },
};
