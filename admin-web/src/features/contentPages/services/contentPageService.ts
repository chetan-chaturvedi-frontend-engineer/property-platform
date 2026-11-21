import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';
import type { EntityId } from '@/types/common.types';

import type {
  ContentPage,
  ContentPageCounts,
  ContentPageFilters,
  ContentPageSummary,
  CreateContentPageRequest,
  UpdateContentPageRequest,
} from '../types/contentPage.types';

/** Drops empty filter values so they are not sent as `status=`. */
function toParams(filters: ContentPageFilters): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      (entry): entry is [string, string | number] =>
        entry[1] !== undefined && entry[1] !== null && entry[1] !== '',
    ),
  );
}

export const contentPageService = {
  async list(
    filters: ContentPageFilters,
    signal?: AbortSignal,
  ): Promise<PageResponse<ContentPageSummary>> {
    const { data } = await apiClient.get<PageResponse<ContentPageSummary>>(
      API_ENDPOINTS.pages.list,
      { params: toParams(filters), signal },
    );
    return data;
  },

  /**
   * Overview counts. There is no stats endpoint, so each count is the total of a one-row list
   * request, sent in parallel.
   */
  async counts(signal?: AbortSignal): Promise<ContentPageCounts> {
    const totalOf = async (filters: ContentPageFilters) =>
      (await contentPageService.list({ ...filters, page: 0, size: 1 }, signal)).totalElements;
    const [total, published, drafts, system] = await Promise.all([
      totalOf({}),
      totalOf({ status: 'publish' }),
      totalOf({ status: 'draft' }),
      totalOf({ type: 'system' }),
    ]);
    return { total, published, drafts, system };
  },

  /**
   * The page that already uses `slug`, or null. There is no slug lookup, but the list search
   * matches slugs, so an exact match among the results is the owner.
   */
  async findBySlug(slug: string, signal?: AbortSignal): Promise<ContentPageSummary | null> {
    const { content } = await contentPageService.list({ search: slug, size: 20 }, signal);
    return content.find((page) => page.slug === slug) ?? null;
  },

  async get(id: EntityId, signal?: AbortSignal): Promise<ContentPage> {
    const { data } = await apiClient.get<ContentPage>(API_ENDPOINTS.pages.detail(id), { signal });
    return data;
  },

  async create(request: CreateContentPageRequest): Promise<ContentPage> {
    const { data } = await apiClient.post<ContentPage>(API_ENDPOINTS.pages.list, request);
    return data;
  },

  async update(id: EntityId, request: UpdateContentPageRequest): Promise<ContentPage> {
    const { data } = await apiClient.patch<ContentPage>(API_ENDPOINTS.pages.detail(id), request);
    return data;
  },

  /** Permanent: pages have no soft delete or trash. */
  async remove(id: EntityId): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.pages.detail(id));
  },
};
