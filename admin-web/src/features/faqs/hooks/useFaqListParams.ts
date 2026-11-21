import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { SortDirection } from '@/components/common/DataTable/DataTable';

import {
  FAQ_SORT_FIELDS,
  FAQ_STATUSES,
  type FaqFilters,
  type FaqSortField,
  type FaqStatus,
} from '../types/faq.types';

/** The backend's own default order (display order); not sent, so the API applies it. */
export const DEFAULT_FAQ_SORT: { field: FaqSortField; direction: SortDirection } = {
  field: 'sortOrder',
  direction: 'asc',
};

/** Category keys are lowercase snake_case (max 50); anything else is ignored, not sent for a 400. */
const CATEGORY_KEY = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

export interface FaqListState {
  search: string;
  category: string;
  status: FaqStatus | undefined;
  sort: { field: FaqSortField; direction: SortDirection };
  page: number;
}

/** Filters, sorting and paging live in the URL, so they survive a reload and can be shared. */
export function useFaqListParams() {
  const [params, setParams] = useSearchParams();
  const rawCategory = params.get('cat') ?? '';
  const state: FaqListState = {
    search: params.get('q') ?? '',
    category: rawCategory.length <= 50 && CATEGORY_KEY.test(rawCategory) ? rawCategory : '',
    status: oneOf(params.get('status'), FAQ_STATUSES),
    sort: {
      field: oneOf(params.get('sort'), FAQ_SORT_FIELDS) ?? DEFAULT_FAQ_SORT.field,
      direction: oneOf(params.get('dir'), ['asc', 'desc'] as const) ?? DEFAULT_FAQ_SORT.direction,
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
        field === DEFAULT_FAQ_SORT.field && direction === DEFAULT_FAQ_SORT.direction;
      update({ sort: isDefault ? undefined : field, dir: isDefault ? undefined : direction });
    },
    [update],
  );

  const clear = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return { ...state, update, changeSort, clear };
}

export function isDefaultFaqSort(sort: FaqListState['sort']): boolean {
  return sort.field === DEFAULT_FAQ_SORT.field && sort.direction === DEFAULT_FAQ_SORT.direction;
}

/** The API filters for the URL state (without page and size). */
export function toFaqFilters(list: Omit<FaqListState, 'page'>): Omit<FaqFilters, 'page' | 'size'> {
  return {
    search: list.search.trim() || undefined,
    category: list.category || undefined,
    status: list.status,
    sort: isDefaultFaqSort(list.sort) ? undefined : `${list.sort.field},${list.sort.direction}`,
  };
}
