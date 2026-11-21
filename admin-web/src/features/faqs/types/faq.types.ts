import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

/** Enums and limits of `backend/docs/api/faqs.md` (lowercase values, as sent and received). */
export const FAQ_STATUSES = ['draft', 'publish'] as const;
export type FaqStatus = (typeof FAQ_STATUSES)[number];

export const FAQ_LIMITS = {
  question: 500,
  answer: 10_000,
  maxSortOrder: 100_000,
  search: 100,
} as const;

/** Admin list item (`GET /admin/faqs`): everything except the answer. */
export interface FaqSummary {
  id: EntityId;
  /** Plain text; render as text, never as HTML. */
  question: string;
  /** Category key; may be one removed from the configuration. */
  category: string;
  /** Null when the category was removed from the configuration. */
  categoryLabel: Nullable<string>;
  status: FaqStatus;
  sortOrder: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Full FAQ of the detail, create and update responses. */
export interface Faq extends FaqSummary {
  /** Sanitized HTML, exactly as stored. */
  answer: string;
}

export const FAQ_SORT_FIELDS = [
  'sortOrder',
  'question',
  'category',
  'status',
  'createdAt',
  'updatedAt',
] as const;
export type FaqSortField = (typeof FAQ_SORT_FIELDS)[number];

/** Query parameters of `GET /admin/faqs`; every given filter must match. */
export interface FaqFilters extends PageParams {
  /** Question or answer contains, case-insensitive. Max 100. */
  search?: string;
  status?: FaqStatus;
  /** Category key, also a removed one. */
  category?: string;
}

/** `POST /admin/faqs` (JSON). A `publish` status also needs `FAQ_PUBLISH`. */
export interface CreateFaqRequest {
  question: string;
  answer: string;
  category: string;
  /** Default `draft`. */
  status?: FaqStatus;
  /** Default 0. */
  sortOrder?: number;
}

/** `PATCH /admin/faqs/{id}` (JSON). Omitted fields keep their value; `null` is rejected. */
export type UpdateFaqRequest = Partial<CreateFaqRequest>;

/** `GET /public/faq-categories` item, in display order. */
export interface FaqCategory {
  key: string;
  label: string;
}

/**
 * Overview counts. There is no stats endpoint, so each one is the `totalElements` of a one-row list
 * request. FAQs have no soft delete, so there is no trash count.
 */
export interface FaqCounts {
  total: number;
  published: number;
  drafts: number;
}
