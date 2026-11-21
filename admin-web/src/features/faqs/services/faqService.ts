import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';
import type { EntityId } from '@/types/common.types';

import type {
  CreateFaqRequest,
  Faq,
  FaqCategory,
  FaqCounts,
  FaqFilters,
  FaqSummary,
  UpdateFaqRequest,
} from '../types/faq.types';

/** Drops empty filter values so they are not sent as `status=`. */
function toParams(filters: FaqFilters): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      (entry): entry is [string, string | number] =>
        entry[1] !== undefined && entry[1] !== null && entry[1] !== '',
    ),
  );
}

export const faqService = {
  async list(filters: FaqFilters, signal?: AbortSignal): Promise<PageResponse<FaqSummary>> {
    const { data } = await apiClient.get<PageResponse<FaqSummary>>(API_ENDPOINTS.faqs.list, {
      params: toParams(filters),
      signal,
    });
    return data;
  },

  /**
   * Overview counts. There is no stats endpoint, so each count is the total of a one-row list
   * request, sent in parallel.
   */
  async counts(signal?: AbortSignal): Promise<FaqCounts> {
    const totalOf = async (filters: FaqFilters) =>
      (await faqService.list({ ...filters, page: 0, size: 1 }, signal)).totalElements;
    const [total, published, drafts] = await Promise.all([
      totalOf({}),
      totalOf({ status: 'publish' }),
      totalOf({ status: 'draft' }),
    ]);
    return { total, published, drafts };
  },

  /** The display order to suggest for a new FAQ: one after the current highest (0 when none). */
  async nextSortOrder(signal?: AbortSignal): Promise<number> {
    const { content } = await faqService.list({ page: 0, size: 1, sort: 'sortOrder,desc' }, signal);
    const highest = content[0]?.sortOrder;
    return highest === undefined ? 0 : highest + 1;
  },

  async get(id: EntityId, signal?: AbortSignal): Promise<Faq> {
    const { data } = await apiClient.get<Faq>(API_ENDPOINTS.faqs.detail(id), { signal });
    return data;
  },

  async create(request: CreateFaqRequest): Promise<Faq> {
    const { data } = await apiClient.post<Faq>(API_ENDPOINTS.faqs.list, request);
    return data;
  },

  async update(id: EntityId, request: UpdateFaqRequest): Promise<Faq> {
    const { data } = await apiClient.patch<Faq>(API_ENDPOINTS.faqs.detail(id), request);
    return data;
  },

  /** Permanent: FAQs have no soft delete or trash. */
  async remove(id: EntityId): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.faqs.detail(id));
  },

  /** The configured categories in display order (public endpoint, not paginated). */
  async categories(signal?: AbortSignal): Promise<FaqCategory[]> {
    const { data } = await apiClient.get<FaqCategory[]>(API_ENDPOINTS.faqs.categories, { signal });
    return data;
  },
};
