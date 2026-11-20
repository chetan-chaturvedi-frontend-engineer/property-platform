import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { SortDirection } from '@/components/common/DataTable/DataTable';

import { BLOG_SORT_FIELDS, type BlogFilters, type BlogSortField } from '../types/blog.types';

/** The backend's own default order; not sent, so the API applies it. */
export const DEFAULT_BLOG_SORT: { field: BlogSortField; direction: SortDirection } = {
  field: 'createdAt',
  direction: 'desc',
};

/**
 * Status tabs. The API filters by the stored `status` and by `publishedAt` bounds, so "live" is
 * published with `publishedAt` up to now and "scheduled" is published with `publishedAt` after now.
 */
export const BLOG_TABS = ['all', 'live', 'scheduled', 'draft'] as const;
export type BlogTab = (typeof BLOG_TABS)[number];

/** Normalized like stored tags; anything else is ignored rather than sent for a 400. */
const TAG = /^[\p{L}\p{N}][\p{L}\p{N} ._&+#-]{0,49}$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

const date = (value: string | null) => (value && DATE.test(value) ? value : '');
const positiveId = (value: string | null) => {
  const id = value && /^\d{1,18}$/.test(value) ? Number(value) : 0;
  return id > 0 ? id : undefined;
};

/** URL keys of the filter panel, so "reset" knows what to remove. */
export const PANEL_KEYS = ['tag', 'pFrom', 'pTo', 'cFrom', 'cTo'] as const;

/** Local start or end of a `yyyy-MM-dd` day as a UTC instant, for the inclusive date bounds. */
export function dayBoundary(day: string, end: boolean): string {
  return new Date(`${day}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString();
}

/** Filters, sorting and paging live in the URL, so they survive a reload and can be shared. */
export function useBlogListParams() {
  const [params, setParams] = useSearchParams();
  const rawTag = params.get('tag')?.trim().toLowerCase() ?? '';
  const state = {
    search: params.get('q') ?? '',
    tab: oneOf(params.get('tab'), BLOG_TABS) ?? 'all',
    categoryId: positiveId(params.get('cat')),
    tag: TAG.test(rawTag) ? rawTag : '',
    publishedFrom: date(params.get('pFrom')),
    publishedTo: date(params.get('pTo')),
    createdFrom: date(params.get('cFrom')),
    createdTo: date(params.get('cTo')),
    sort: {
      field: oneOf(params.get('sort'), BLOG_SORT_FIELDS) ?? DEFAULT_BLOG_SORT.field,
      direction: oneOf(params.get('dir'), ['asc', 'desc'] as const) ?? DEFAULT_BLOG_SORT.direction,
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

export type BlogListParams = ReturnType<typeof useBlogListParams>;

const validRange = (from: string, to: string) => !from || !to || from <= to;

function maxIso(value: string | undefined, other: string): string {
  return value && value > other ? value : other;
}

function minIso(value: string | undefined, other: string): string {
  return value && value < other ? value : other;
}

/**
 * The API filters for the URL state (without page and size). `now` is the moment treated as
 * current for the live / scheduled tabs; it is fixed per load so the query key stays stable.
 * Invalid ranges (end before start) are left out instead of being sent for a 400.
 */
export function toBlogFilters(
  list: Omit<BlogListParams, 'update' | 'clear' | 'page'>,
  now: string,
): Omit<BlogFilters, 'page' | 'size'> {
  const publishedValid = validRange(list.publishedFrom, list.publishedTo);
  const createdValid = validRange(list.createdFrom, list.createdTo);
  const isDefaultSort =
    list.sort.field === DEFAULT_BLOG_SORT.field &&
    list.sort.direction === DEFAULT_BLOG_SORT.direction;

  const filters: Omit<BlogFilters, 'page' | 'size'> = {
    search: list.search || undefined,
    categoryId: list.categoryId,
    tag: list.tag || undefined,
    publishedFrom:
      publishedValid && list.publishedFrom ? dayBoundary(list.publishedFrom, false) : undefined,
    publishedTo:
      publishedValid && list.publishedTo ? dayBoundary(list.publishedTo, true) : undefined,
    createdFrom:
      createdValid && list.createdFrom ? dayBoundary(list.createdFrom, false) : undefined,
    createdTo: createdValid && list.createdTo ? dayBoundary(list.createdTo, true) : undefined,
    sort: isDefaultSort ? undefined : `${list.sort.field},${list.sort.direction}`,
  };

  switch (list.tab) {
    case 'draft':
      return { ...filters, status: 'draft' };
    case 'live':
      // Both bounds must hold, so an earlier user-chosen upper bound wins.
      return { ...filters, status: 'publish', publishedTo: minIso(filters.publishedTo, now) };
    case 'scheduled':
      return { ...filters, status: 'publish', publishedFrom: maxIso(filters.publishedFrom, now) };
    default:
      return filters;
  }
}
