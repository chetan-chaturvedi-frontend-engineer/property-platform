import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { SortDirection } from '@/components/common/DataTable/DataTable';

import {
  BANNER_LINK_TYPES,
  BANNER_SORT_FIELDS,
  type BannerFilters,
  type BannerSortField,
} from '../types/banner.types';

/** The backend's own default order; not sent, so the API applies it. */
export const DEFAULT_BANNER_SORT: { field: BannerSortField; direction: SortDirection } = {
  field: 'createdAt',
  direction: 'desc',
};

/**
 * Status filter of the toolbar. The API filters by the stored `status` and by date bounds, so
 * "scheduled" and "expired" are active banners whose start is after / end is before now. "Live
 * now" cannot be expressed exactly (open bounds are not matched by date filters), so "active" means
 * every enabled banner, whatever its schedule.
 */
export const STATE_FILTERS = ['active', 'inactive', 'scheduled', 'expired'] as const;
export type StateFilter = (typeof STATE_FILTERS)[number];

const KEY = /^[a-z][a-z0-9_]*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

const key = (value: string | null) => (value && KEY.test(value) ? value : '');
const date = (value: string | null) => (value && DATE.test(value) ? value : '');

/** URL keys of the filter panel, so "reset" knows what to remove. */
export const PANEL_KEYS = ['link', 'sFrom', 'sTo', 'eFrom', 'eTo'] as const;

/** Local start or end of a `yyyy-MM-dd` day as a UTC instant, for the inclusive date bounds. */
export function dayBoundary(day: string, end: boolean): string {
  return new Date(`${day}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString();
}

/**
 * Filters, sorting and paging live in the URL, so they survive a reload and the back button, and a
 * filtered view can be shared.
 */
export function useBannerListParams() {
  const [params, setParams] = useSearchParams();
  const state = {
    search: params.get('q') ?? '',
    state: oneOf(params.get('state'), STATE_FILTERS),
    type: key(params.get('type')),
    placement: key(params.get('placement')),
    linkType: oneOf(params.get('link'), BANNER_LINK_TYPES),
    startFrom: date(params.get('sFrom')),
    startTo: date(params.get('sTo')),
    endFrom: date(params.get('eFrom')),
    endTo: date(params.get('eTo')),
    sort: {
      field: oneOf(params.get('sort'), BANNER_SORT_FIELDS) ?? DEFAULT_BANNER_SORT.field,
      direction:
        oneOf(params.get('dir'), ['asc', 'desc'] as const) ?? DEFAULT_BANNER_SORT.direction,
    },
    page: Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0),
  };

  /** Updates the given keys; any filter change returns to the first page. */
  const update = useCallback(
    (changes: Record<string, string | number | undefined>, resetPage = true) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [name, value] of Object.entries(changes)) {
            if (value === undefined || value === '' || (name === 'page' && value === 0)) {
              next.delete(name);
            } else {
              next.set(name, String(value));
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

export type BannerListParams = ReturnType<typeof useBannerListParams>;

const validRange = (from: string, to: string) => !from || !to || from <= to;

/**
 * The API filters for the URL state (without page and size). `now` is the moment the page treats as
 * current for "scheduled" / "expired"; it is fixed per load so the query key stays stable. Invalid
 * ranges (end before start) are left out instead of being sent for a 400; the panel shows why.
 */
export function toBannerFilters(
  list: Omit<BannerListParams, 'update' | 'clear' | 'page'>,
  now: string,
): Omit<BannerFilters, 'page' | 'size'> {
  const startValid = validRange(list.startFrom, list.startTo);
  const endValid = validRange(list.endFrom, list.endTo);
  const isDefaultSort =
    list.sort.field === DEFAULT_BANNER_SORT.field &&
    list.sort.direction === DEFAULT_BANNER_SORT.direction;

  const filters: Omit<BannerFilters, 'page' | 'size'> = {
    search: list.search || undefined,
    type: list.type || undefined,
    placement: list.placement || undefined,
    linkType: list.linkType,
    startDateFrom: startValid && list.startFrom ? dayBoundary(list.startFrom, false) : undefined,
    startDateTo: startValid && list.startTo ? dayBoundary(list.startTo, true) : undefined,
    endDateFrom: endValid && list.endFrom ? dayBoundary(list.endFrom, false) : undefined,
    endDateTo: endValid && list.endTo ? dayBoundary(list.endTo, true) : undefined,
    sort: isDefaultSort ? undefined : `${list.sort.field},${list.sort.direction}`,
  };

  switch (list.state) {
    case 'active':
    case 'inactive':
      return { ...filters, status: list.state };
    case 'scheduled':
      // Both bounds must hold, so a later user-chosen lower bound wins.
      return {
        ...filters,
        status: 'active',
        startDateFrom: maxIso(filters.startDateFrom, now),
      };
    case 'expired':
      return { ...filters, status: 'active', endDateTo: minIso(filters.endDateTo, now) };
    default:
      return filters;
  }
}

function maxIso(value: string | undefined, other: string): string {
  return value && value > other ? value : other;
}

function minIso(value: string | undefined, other: string): string {
  return value && value < other ? value : other;
}
