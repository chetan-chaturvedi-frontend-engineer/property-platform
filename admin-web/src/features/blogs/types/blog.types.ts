import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

/** Enums of `backend/docs/api/blogs.md` (lowercase values, as sent and received). */
export const BLOG_STATUSES = ['draft', 'publish'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

/**
 * Computed by the backend at response time: `scheduled` = published with a future `publishedAt`,
 * `category_hidden` = published but its category is inactive, so the public cannot see it.
 */
export const BLOG_PUBLIC_STATES = ['draft', 'scheduled', 'live', 'category_hidden'] as const;
export type BlogPublicState = (typeof BLOG_PUBLIC_STATES)[number];

export const BLOG_CATEGORY_STATUSES = ['active', 'inactive'] as const;
export type BlogCategoryStatus = (typeof BLOG_CATEGORY_STATUSES)[number];

/** The category of a blog in admin responses. */
export interface BlogCategoryRef {
  id: EntityId;
  title: string;
  slug: string;
  status: BlogCategoryStatus;
}

/** Admin list item (`GET /admin/blogs`): no content and no SEO fields. */
export interface BlogSummary {
  id: EntityId;
  title: string;
  slug: string;
  /** API path that streams the image after authorization; null without an image. */
  featureImageUrl: Nullable<string>;
  category: Nullable<BlogCategoryRef>;
  shortDescription: Nullable<string>;
  status: BlogStatus;
  publicState: BlogPublicState;
  /** Always set for published blogs; a draft may keep a planned or past time. */
  publishedAt: Nullable<IsoDateTime>;
  /** Normalized (lowercase), never null. */
  tags: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Full blog of the detail, create and update responses. */
export interface Blog extends BlogSummary {
  /** Sanitized HTML, exactly as stored. */
  content: string;
  metaTitle: Nullable<string>;
  metaDescription: Nullable<string>;
}

export const BLOG_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'publishedAt',
  'title',
  'slug',
  'status',
] as const;
export type BlogSortField = (typeof BLOG_SORT_FIELDS)[number];

/** Query parameters of `GET /admin/blogs`; every given filter must match. */
export interface BlogFilters extends PageParams {
  /** Title or slug contains, case-insensitive. Max 100. */
  search?: string;
  status?: BlogStatus;
  categoryId?: EntityId;
  /** One tag, normalized by the backend. */
  tag?: string;
  /** Inclusive ISO-8601 instants. */
  publishedFrom?: IsoDateTime;
  publishedTo?: IsoDateTime;
  createdFrom?: IsoDateTime;
  createdTo?: IsoDateTime;
}

/** Multipart fields of `POST /admin/blogs`, sent with an optional `featureImage` file. */
export interface CreateBlogRequest {
  title: string;
  content: string;
  /** Generated from the title when omitted. */
  slug?: string;
  /** Required to publish. */
  categoryId?: EntityId;
  shortDescription?: string;
  /** Default `draft`. */
  status?: BlogStatus;
  /** Publish: default now; future = scheduled. */
  publishedAt?: IsoDateTime;
  metaTitle?: string;
  metaDescription?: string;
  /** Sent as a repeated `tags` field. */
  tags?: string[];
}

/**
 * `PATCH /admin/blogs/{id}` (JSON). Omitted fields keep their value; `null` clears
 * shortDescription, metaTitle, metaDescription, tags and (drafts only) categoryId and publishedAt.
 */
export interface UpdateBlogRequest {
  title?: string;
  slug?: string;
  content?: string;
  categoryId?: Nullable<EntityId>;
  shortDescription?: Nullable<string>;
  status?: BlogStatus;
  publishedAt?: Nullable<IsoDateTime>;
  metaTitle?: Nullable<string>;
  metaDescription?: Nullable<string>;
  tags?: Nullable<string[]>;
}

/**
 * Overview counts. There is no stats endpoint, so each one is the `totalElements` of a one-row list
 * request. `live` includes published blogs hidden by an inactive category (not filterable).
 */
export interface BlogCounts {
  total: number;
  drafts: number;
  published: number;
  scheduled: number;
  live: number;
}

/** `GET /admin/blog-categories` item (fields used here). */
export interface BlogCategory {
  id: EntityId;
  title: string;
  slug: string;
  status: BlogCategoryStatus;
  blogCount: number;
}

/** Multipart fields of `POST /admin/blog-categories` used by the quick-add dialog. */
export interface CreateBlogCategoryRequest {
  title: string;
  status?: BlogCategoryStatus;
}
