import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { downloadApiImage, UPLOAD_OPTIONS, uploadProgress } from '@/services/api/assetDownload';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';
import type { EntityId } from '@/types/common.types';

import type {
  Banner,
  BannerActivityEntry,
  BannerCounts,
  BannerFilters,
  ContentPageOption,
  CreateBannerRequest,
  UpdateBannerRequest,
  UploadProgressHandler,
} from '../types/banner.types';

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

export const bannerService = {
  async list(filters: BannerFilters, signal?: AbortSignal): Promise<PageResponse<Banner>> {
    const { data } = await apiClient.get<PageResponse<Banner>>(API_ENDPOINTS.banners.list, {
      params: toParams(filters),
      signal,
    });
    return data;
  },

  /** Every banner matching the filters, page by page (100 per request), up to `limit` rows. */
  async listAll(
    filters: Omit<BannerFilters, 'page' | 'size'>,
    { limit, signal }: { limit: number; signal?: AbortSignal },
  ): Promise<{ rows: Banner[]; total: number }> {
    const rows: Banner[] = [];
    let page = 0;
    let total = 0;
    do {
      const result = await bannerService.list({ ...filters, page, size: MAX_PAGE_SIZE }, signal);
      total = result.totalElements;
      rows.push(...result.content);
      page += 1;
      if (page >= result.totalPages) break;
    } while (rows.length < limit);
    return { rows: rows.slice(0, limit), total };
  },

  /**
   * Overview counts. There is no stats endpoint, so each count is the total of a one-row list
   * request, sent in parallel. "Now" is taken once so the scheduled and expired windows agree.
   */
  async counts(signal?: AbortSignal): Promise<BannerCounts> {
    const now = new Date().toISOString();
    const totalOf = async (filters: BannerFilters) =>
      (await bannerService.list({ ...filters, page: 0, size: 1 }, signal)).totalElements;
    const [total, active, inactive, scheduled, expired] = await Promise.all([
      totalOf({}),
      totalOf({ status: 'active' }),
      totalOf({ status: 'inactive' }),
      totalOf({ status: 'active', startDateFrom: now }),
      totalOf({ status: 'active', endDateTo: now }),
    ]);
    return {
      total,
      active,
      inactive,
      scheduled,
      expired,
      live: Math.max(0, active - scheduled - expired),
    };
  },

  async get(id: EntityId, signal?: AbortSignal): Promise<Banner> {
    const { data } = await apiClient.get<Banner>(API_ENDPOINTS.banners.detail(id), { signal });
    return data;
  },

  /** `multipart/form-data`: the image plus the fields; omitted fields take the backend defaults. */
  async create(
    request: CreateBannerRequest,
    image: File,
    onProgress?: UploadProgressHandler,
  ): Promise<Banner> {
    const form = new FormData();
    form.append('image', image);
    for (const [key, value] of Object.entries(request)) {
      if (typeof value === 'string' && value !== '') form.append(key, value);
    }
    const { data } = await apiClient.post<Banner>(API_ENDPOINTS.banners.list, form, {
      ...UPLOAD_OPTIONS,
      onUploadProgress: uploadProgress(onProgress),
    });
    return data;
  },

  async update(id: EntityId, request: UpdateBannerRequest): Promise<Banner> {
    const { data } = await apiClient.patch<Banner>(API_ENDPOINTS.banners.detail(id), request);
    return data;
  },

  async replaceImage(
    id: EntityId,
    image: File,
    onProgress?: UploadProgressHandler,
  ): Promise<Banner> {
    const form = new FormData();
    form.append('image', image);
    const { data } = await apiClient.put<Banner>(API_ENDPOINTS.banners.image(id), form, {
      ...UPLOAD_OPTIONS,
      onUploadProgress: uploadProgress(onProgress),
    });
    return data;
  },

  /** Soft delete on the backend: the banner disappears everywhere, the row and image are kept. */
  async remove(id: EntityId): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.banners.detail(id));
  },

  /**
   * Downloads a banner's current image as a File (for "duplicate": a new banner needs its own
   * upload). The URL is the API path from the banner response, read with the session cookie.
   */
  async downloadImage(
    banner: Pick<Banner, 'id' | 'imageUrl'>,
    signal?: AbortSignal,
  ): Promise<File> {
    return downloadApiImage(banner.imageUrl, `banner-${banner.id}-copy`, signal);
  },

  /** Published content pages, as internal link targets (`/pages/{slug}`). Needs `PAGE_VIEW`. */
  async contentPages(signal?: AbortSignal): Promise<ContentPageOption[]> {
    const { data } = await apiClient.get<PageResponse<ContentPageOption>>(
      API_ENDPOINTS.pages.list,
      {
        params: { status: 'publish', sort: 'heading,asc', size: MAX_PAGE_SIZE },
        signal,
      },
    );
    return data.content;
  },

  /**
   * The banner's audit trail. Every successful admin write is logged by the backend with module
   * `banners` and the banner id as reference. Needs `SYSTEM_LOG_LIST`.
   */
  async activity(id: EntityId, signal?: AbortSignal): Promise<BannerActivityEntry[]> {
    const { data } = await apiClient.get<PageResponse<BannerActivityEntry>>(
      API_ENDPOINTS.systemLogs.list,
      { params: { module: 'banners', referenceId: id, size: 20 }, signal },
    );
    return data.content;
  },
};
