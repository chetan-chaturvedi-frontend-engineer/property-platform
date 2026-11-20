import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

/** Enums of `backend/docs/api/subscription-plans.md` (lowercase values, as sent and received). */
export const PLAN_STATUSES = ['active', 'draft', 'inactive'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const BILLING_INTERVALS = ['month', 'year', 'lifetime'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/** Every admin endpoint returns this shape; the list wraps it in `PageResponse`. */
export interface SubscriptionPlan {
  id: EntityId;
  /** UI icon identifier such as `crown`; not a URL. */
  icon: Nullable<string>;
  /** Object storage key or `https://` URL. */
  photo: Nullable<string>;
  title: string;
  slug: string;
  price: number;
  /** ISO 4217, e.g. `INR`. */
  currency: string;
  billingInterval: BillingInterval;
  /** 1-36; always 1 for `lifetime`. 3 x `month` = quarterly. */
  billingIntervalCount: number;
  description: Nullable<string>;
  /** Active listing limit; `null` = unlimited. */
  noOfProperties: Nullable<number>;
  /** Builder team seats; 0 = team management not included. */
  noOfTeamMembers: number;
  /** Display-only list. */
  features: string[];
  status: PlanStatus;
  popular: boolean;
  sortOrder: number;
  trialDays: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export const PLAN_SORT_FIELDS = ['sortOrder', 'title', 'price', 'createdAt', 'updatedAt'] as const;
export type PlanSortField = (typeof PLAN_SORT_FIELDS)[number];

export interface PlanFilters extends PageParams {
  /** Title or slug, case-insensitive. Max 100. */
  search?: string;
  status?: PlanStatus;
  billingInterval?: BillingInterval;
  popular?: boolean;
  minPrice?: number;
  maxPrice?: number;
  /** Inclusive ISO-8601 instants. */
  createdFrom?: IsoDateTime;
  createdTo?: IsoDateTime;
}

/** `POST /admin/subscription-plans`: omitted optional fields take the backend defaults. */
export interface CreatePlanRequest {
  title: string;
  price: number;
  slug?: string;
  icon?: string;
  photo?: string;
  currency?: string;
  billingInterval?: BillingInterval;
  billingIntervalCount?: number;
  description?: string;
  /** Omitted or `null` = unlimited. */
  noOfProperties?: Nullable<number>;
  noOfTeamMembers?: number;
  features?: string[];
  status?: PlanStatus;
  popular?: boolean;
  sortOrder?: number;
  trialDays?: number;
}

/**
 * `PATCH /admin/subscription-plans/{id}`: omitted fields keep their value; `null` clears icon, photo,
 * description and noOfProperties (= unlimited) only.
 */
export interface UpdatePlanRequest {
  title?: string;
  price?: number;
  slug?: string;
  icon?: Nullable<string>;
  photo?: Nullable<string>;
  currency?: string;
  billingInterval?: BillingInterval;
  billingIntervalCount?: number;
  description?: Nullable<string>;
  noOfProperties?: Nullable<number>;
  noOfTeamMembers?: number;
  features?: string[];
  status?: PlanStatus;
  popular?: boolean;
  sortOrder?: number;
  trialDays?: number;
}

/**
 * Plan counts for the overview. There is no stats endpoint, so each count is the `totalElements` of a
 * one-row list request with that filter.
 */
export interface PlanCounts {
  total: number;
  byStatus: Record<PlanStatus, number>;
  popular: number;
}
