import { downloadApiImage, UPLOAD_OPTIONS, uploadProgress } from '@/services/api/assetDownload';
import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';
import type { EntityId } from '@/types/common.types';
import type { UploadProgressHandler } from '@/utils/image';

import type {
  Blog,
  BlogCategory,
  BlogCounts,
  BlogFilters,
  BlogSummary,
  CreateBlogCategoryRequest,
  CreateBlogRequest,
  UpdateBlogRequest,
} from '../types/blog.types';

/** The API caps page size at 100. */
export const MAX_PAGE_SIZE = 100;

/** Drops empty filter values so they are not sent as `status=`. */
function toParams(filters: object): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

export const blogService = {
  async list(filters: BlogFilters, signal?: AbortSignal): Promise<PageResponse<BlogSummary>> {
    const { data } = await apiClient.get<PageResponse<BlogSummary>>(API_ENDPOINTS.blogs.list, {
      params: toParams(filters),
      signal,
    });
    return data;
  },

  /** Every blog matching the filters, page by page (100 per request), up to `limit` rows. */
  async listAll(
    filters: Omit<BlogFilters, 'page' | 'size'>,
    { limit, signal }: { limit: number; signal?: AbortSignal },
  ): Promise<{ rows: BlogSummary[]; total: number }> {
    const rows: BlogSummary[] = [];
    let page = 0;
    let total = 0;
    do {
      const result = await blogService.list({ ...filters, page, size: MAX_PAGE_SIZE }, signal);
      total = result.totalElements;
      rows.push(...result.content);
      page += 1;
      if (page >= result.totalPages) break;
    } while (rows.length < limit);
    return { rows: rows.slice(0, limit), total };
  },

  /**
   * Overview counts. There is no stats endpoint, so each count is the total of a one-row list
   * request, sent in parallel. "Now" is taken once so scheduled and live add up to published.
   */
  async counts(signal?: AbortSignal): Promise<BlogCounts> {
    const now = new Date().toISOString();
    const totalOf = async (filters: BlogFilters) =>
      (await blogService.list({ ...filters, page: 0, size: 1 }, signal)).totalElements;
    const [total, drafts, published, scheduled] = await Promise.all([
      totalOf({}),
      totalOf({ status: 'draft' }),
      totalOf({ status: 'publish' }),
      totalOf({ status: 'publish', publishedFrom: now }),
    ]);
    return { total, drafts, published, scheduled, live: Math.max(0, published - scheduled) };
  },

  async get(id: EntityId, signal?: AbortSignal): Promise<Blog> {
    const { data } = await apiClient.get<Blog>(API_ENDPOINTS.blogs.detail(id), { signal });
    return data;
  },

  /**
   * The blog using exactly this slug, if any (deleted blogs are not listed, but still reserve their
   * slug; the save reports those with 409). The list search matches title or slug.
   */
  async findBySlug(slug: string, signal?: AbortSignal): Promise<BlogSummary | null> {
    const { content } = await blogService.list({ search: slug, size: 20 }, signal);
    return content.find((blog) => blog.slug === slug) ?? null;
  },

  /** Tags of the most recently updated blogs, as suggestions (there is no tag endpoint). */
  async recentTags(signal?: AbortSignal): Promise<string[]> {
    const { content } = await blogService.list(
      { size: MAX_PAGE_SIZE, sort: 'updatedAt,desc' },
      signal,
    );
    return [...new Set(content.flatMap((blog) => blog.tags))].sort();
  },

  /** `multipart/form-data`: the fields (tags repeated) plus an optional feature image. */
  async create(
    request: CreateBlogRequest,
    featureImage: File | null,
    onProgress?: UploadProgressHandler,
  ): Promise<Blog> {
    const form = new FormData();
    for (const [key, value] of Object.entries(request)) {
      if (Array.isArray(value)) {
        for (const item of value) if (typeof item === 'string') form.append(key, item);
      } else if (typeof value === 'number') {
        form.append(key, String(value));
      } else if (typeof value === 'string' && value !== '') {
        form.append(key, value);
      }
    }
    if (featureImage) form.append('featureImage', featureImage);
    const { data } = await apiClient.post<Blog>(API_ENDPOINTS.blogs.list, form, {
      ...UPLOAD_OPTIONS,
      onUploadProgress: uploadProgress(onProgress),
    });
    return data;
  },

  async update(id: EntityId, request: UpdateBlogRequest): Promise<Blog> {
    const { data } = await apiClient.patch<Blog>(API_ENDPOINTS.blogs.detail(id), request);
    return data;
  },

  async replaceFeatureImage(
    id: EntityId,
    featureImage: File,
    onProgress?: UploadProgressHandler,
  ): Promise<Blog> {
    const form = new FormData();
    form.append('featureImage', featureImage);
    const { data } = await apiClient.put<Blog>(API_ENDPOINTS.blogs.featureImage(id), form, {
      ...UPLOAD_OPTIONS,
      onUploadProgress: uploadProgress(onProgress),
    });
    return data;
  },

  async removeFeatureImage(id: EntityId): Promise<Blog> {
    const { data } = await apiClient.delete<Blog>(API_ENDPOINTS.blogs.featureImage(id));
    return data;
  },

  /** Soft delete on the backend: hidden everywhere; the row, image and slug are kept. */
  async remove(id: EntityId): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.blogs.detail(id));
  },

  /** The feature image as a File, for a duplicate (a new blog needs its own upload). */
  async downloadFeatureImage(
    blog: Pick<Blog, 'id' | 'featureImageUrl'>,
    signal?: AbortSignal,
  ): Promise<File | null> {
    if (!blog.featureImageUrl) return null;
    return downloadApiImage(blog.featureImageUrl, `blog-${blog.id}-copy`, signal);
  },

  /** Every non-deleted category (active and inactive), by title. Needs `BLOG_CATEGORY_VIEW`. */
  async categories(signal?: AbortSignal): Promise<BlogCategory[]> {
    const { data } = await apiClient.get<PageResponse<BlogCategory>>(
      API_ENDPOINTS.blogCategories.list,
      { params: { sort: 'title,asc', size: MAX_PAGE_SIZE }, signal },
    );
    return data.content;
  },

  /** Quick add from the blog form; slug generated by the backend. Needs `BLOG_CATEGORY_CREATE`. */
  async createCategory(request: CreateBlogCategoryRequest): Promise<BlogCategory> {
    const form = new FormData();
    form.append('title', request.title);
    if (request.status) form.append('status', request.status);
    const { data } = await apiClient.post<BlogCategory>(API_ENDPOINTS.blogCategories.list, form);
    return data;
  },
};
