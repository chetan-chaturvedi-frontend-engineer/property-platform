import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { SortDirection } from '@/components/common/DataTable/DataTable';

import {
  CONTENT_PAGE_SORT_FIELDS,
  CONTENT_PAGE_STATUSES,
  CONTENT_PAGE_TYPES,
  type ContentPageFilters,
  type ContentPageSortField,
  type ContentPageStatus,
  type ContentPageType,
} from '../types/contentPage.types';

/** The backend's own default order (newest first); not sent, so the API applies it. */
export const DEFAULT_CONTENT_PAGE_SORT: { field: ContentPageSortField; direction: SortDirection } =
  { field: 'createdAt', direction: 'desc' };

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

export interface ContentPageListState {
  search: string;
  status: ContentPageStatus | undefined;
  type: ContentPageType | undefined;
  sort: { field: ContentPageSortField; direction: SortDirection };
  page: number;
}

/** Filters, sorting and paging live in the URL, so they survive a reload and can be shared. */
export function useContentPageListParams() {
  const [params, setParams] = useSearchParams();
  const state: ContentPageListState = {
    search: params.get('q') ?? '',
    status: oneOf(params.get('status'), CONTENT_PAGE_STATUSES),
    type: oneOf(params.get('type'), CONTENT_PAGE_TYPES),
    sort: {
      field: oneOf(params.get('sort'), CONTENT_PAGE_SORT_FIELDS) ?? DEFAULT_CONTENT_PAGE_SORT.field,
      direction:
        oneOf(params.get('dir'), ['asc', 'desc'] as const) ?? DEFAULT_CONTENT_PAGE_SORT.direction,
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

  /** Sets the sort; the default order is removed from the URL. */
  const changeSort = useCallback(
    (field: string, direction: SortDirection) => {
      const isDefault =
        field === DEFAULT_CONTENT_PAGE_SORT.field &&
        direction === DEFAULT_CONTENT_PAGE_SORT.direction;
      update({ sort: isDefault ? undefined : field, dir: isDefault ? undefined : direction });
    },
    [update],
  );

  const clear = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return { ...state, update, changeSort, clear };
}

export function isDefaultContentPageSort(sort: ContentPageListState['sort']): boolean {
  return (
    sort.field === DEFAULT_CONTENT_PAGE_SORT.field &&
    sort.direction === DEFAULT_CONTENT_PAGE_SORT.direction
  );
}

/** The API filters for the URL state (without page and size). */
export function toContentPageFilters(
  list: Omit<ContentPageListState, 'page'>,
): Omit<ContentPageFilters, 'page' | 'size'> {
  return {
    search: list.search.trim() || undefined,
    status: list.status,
    type: list.type,
    sort: isDefaultContentPageSort(list.sort)
      ? undefined
      : `${list.sort.field},${list.sort.direction}`,
  };
}
