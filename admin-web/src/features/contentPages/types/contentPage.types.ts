import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

/** Enums and limits of `backend/docs/api/pages.md` (lowercase values, as sent and received). */
export const CONTENT_PAGE_STATUSES = ['draft', 'publish'] as const;
export type ContentPageStatus = (typeof CONTENT_PAGE_STATUSES)[number];

/** A label for the dashboard and clients only: it changes no permission, visibility or routing. */
export const CONTENT_PAGE_TYPES = ['static', 'system'] as const;
export type ContentPageType = (typeof CONTENT_PAGE_TYPES)[number];

export const CONTENT_PAGE_LIMITS = {
  heading: 255,
  subHeading: 255,
  slug: 255,
  content: 100_000,
  metaTitle: 255,
  metaDescription: 1000,
  metaKeywords: 1000,
  search: 100,
} as const;

/** Admin list item (`GET /admin/pages`): no content or meta fields. */
export interface ContentPageSummary {
  id: EntityId;
  /** Plain text; render as text, never as HTML. */
  heading: string;
  subHeading: Nullable<string>;
  slug: string;
  type: ContentPageType;
  status: ContentPageStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Full page of the detail, create and update responses. */
export interface ContentPage extends ContentPageSummary {
  /** Sanitized HTML, exactly as stored. */
  content: string;
  metaTitle: Nullable<string>;
  metaDescription: Nullable<string>;
  /** Comma-separated, e.g. `privacy, data protection`. */
  metaKeywords: Nullable<string>;
}

export const CONTENT_PAGE_SORT_FIELDS = [
  'createdAt',
  'heading',
  'slug',
  'type',
  'status',
  'updatedAt',
] as const;
export type ContentPageSortField = (typeof CONTENT_PAGE_SORT_FIELDS)[number];

/** Query parameters of `GET /admin/pages`; every given filter must match. */
export interface ContentPageFilters extends PageParams {
  /** Heading, sub heading or slug contains, case-insensitive. Max 100. */
  search?: string;
  status?: ContentPageStatus;
  type?: ContentPageType;
}

/** `POST /admin/pages` (JSON). A `publish` status also needs `PAGE_PUBLISH`. */
export interface CreateContentPageRequest {
  heading: string;
  subHeading?: string;
  /** Omitted: generated from the heading and made unique by the backend. */
  slug?: string;
  content: string;
  /** Default `static`. */
  type?: ContentPageType;
  /** Default `draft`. */
  status?: ContentPageStatus;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

/**
 * `PATCH /admin/pages/{id}` (JSON). Omitted fields keep their value; `null` clears the optional text
 * fields and is rejected for the others.
 */
export interface UpdateContentPageRequest {
  heading?: string;
  subHeading?: string | null;
  slug?: string;
  content?: string;
  type?: ContentPageType;
  status?: ContentPageStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
}

/**
 * Overview counts. There is no stats endpoint, so each one is the `totalElements` of a one-row list
 * request. Pages have no soft delete, so there is no trash count.
 */
export interface ContentPageCounts {
  total: number;
  published: number;
  drafts: number;
  system: number;
}
