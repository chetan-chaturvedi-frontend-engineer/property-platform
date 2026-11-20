import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { SortDirection } from '@/components/common/DataTable/DataTable';

import {
  BILLING_INTERVALS,
  PLAN_SORT_FIELDS,
  PLAN_STATUSES,
  type PlanFilters,
  type PlanSortField,
} from '../types/subscriptionPlan.types';

/** The backend's own default order; not sent, so the API applies it (then newest first). */
export const DEFAULT_PLAN_SORT: { field: PlanSortField; direction: SortDirection } = {
  field: 'sortOrder',
  direction: 'asc',
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PRICE = /^\d{1,12}(\.\d{1,2})?$/;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

const price = (value: string | null) => (value && PRICE.test(value) ? value : '');
const date = (value: string | null) => (value && DATE.test(value) ? value : '');

/** URL keys of the filter panel, so "reset" knows what to remove. */
export const PANEL_KEYS = ['interval', 'popular', 'min', 'max', 'from', 'to'] as const;

/** Local start or end of a `yyyy-MM-dd` day as a UTC instant, for the inclusive `created*` bounds. */
function dayBoundary(day: string, end: boolean): string {
  return new Date(`${day}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString();
}

/**
 * Filters, sorting and paging live in the URL, so they survive a reload and the back button, and a
 * filtered view can be shared.
 */
export function usePlanListParams() {
  const [params, setParams] = useSearchParams();
  const state = {
    status: oneOf(params.get('status'), PLAN_STATUSES),
    search: params.get('q') ?? '',
    billingInterval: oneOf(params.get('interval'), BILLING_INTERVALS),
    popular: oneOf(params.get('popular'), ['yes', 'no'] as const),
    minPrice: price(params.get('min')),
    maxPrice: price(params.get('max')),
    createdFrom: date(params.get('from')),
    createdTo: date(params.get('to')),
    sort: {
      field: oneOf(params.get('sort'), PLAN_SORT_FIELDS) ?? DEFAULT_PLAN_SORT.field,
      direction: oneOf(params.get('dir'), ['asc', 'desc'] as const) ?? DEFAULT_PLAN_SORT.direction,
    },
    page: Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0),
  };

  /** Updates the given keys; any filter change returns to the first page. */
  const update = useCallback(
    (changes: Record<string, string | number | undefined>, resetPage = true) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === '' || (key === 'page' && value === 0)) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          if (resetPage && !('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const clear = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return { ...state, update, clear };
}

export type PlanListParams = ReturnType<typeof usePlanListParams>;

/**
 * The API filters for the current URL state (without page and size). Invalid ranges (max below min,
 * end before start) are left out instead of being sent for a 400; the panel shows why.
 */
export function toPlanFilters(list: PlanListParams): Omit<PlanFilters, 'page' | 'size'> {
  const priceRangeValid =
    !list.minPrice || !list.maxPrice || Number(list.minPrice) <= Number(list.maxPrice);
  const dateRangeValid = !list.createdFrom || !list.createdTo || list.createdFrom <= list.createdTo;
  const isDefaultSort =
    list.sort.field === DEFAULT_PLAN_SORT.field &&
    list.sort.direction === DEFAULT_PLAN_SORT.direction;
  return {
    search: list.search || undefined,
    status: list.status,
    billingInterval: list.billingInterval,
    popular: list.popular === undefined ? undefined : list.popular === 'yes',
    minPrice: priceRangeValid && list.minPrice ? Number(list.minPrice) : undefined,
    maxPrice: priceRangeValid && list.maxPrice ? Number(list.maxPrice) : undefined,
    createdFrom:
      dateRangeValid && list.createdFrom ? dayBoundary(list.createdFrom, false) : undefined,
    createdTo: dateRangeValid && list.createdTo ? dayBoundary(list.createdTo, true) : undefined,
    sort: isDefaultSort ? undefined : `${list.sort.field},${list.sort.direction}`,
  };
}
