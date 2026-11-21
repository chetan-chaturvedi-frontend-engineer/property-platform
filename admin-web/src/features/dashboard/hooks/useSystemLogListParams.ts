import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { SortDirection } from '@/components/common/DataTable/DataTable';
import type { PickerOption } from '@/components/common/SearchAutocomplete';

import {
  SYSTEM_LOG_LEVELS,
  SYSTEM_LOG_SORT_FIELDS,
  type SystemLogFilters,
  type SystemLogLevel,
  type SystemLogSortField,
} from '../types/systemLog.types';
import {
  DATE_RANGE_PRESETS,
  type DateRange,
  MODULE_PATTERN,
  parseDay,
  rangeToInstants,
  searchToFilters,
} from '../utils/systemLogDisplay';

/** The backend's own default order (newest first); not sent, so the API applies it. */
export const DEFAULT_SYSTEM_LOG_SORT: { field: SystemLogSortField; direction: SortDirection } = {
  field: 'createdAt',
  direction: 'desc',
};

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

function positiveInt(value: string | null): number | undefined {
  if (!value || !/^\d{1,15}$/.test(value)) return undefined;
  const number = Number(value);
  return number > 0 ? number : undefined;
}

export interface SystemLogListState {
  search: string;
  module: string | undefined;
  logLevel: SystemLogLevel | undefined;
  /** The user filter; the name comes along in the URL so the picker and chip can show it. */
  user: PickerOption | null;
  referenceId: number | undefined;
  range: DateRange;
  sort: { field: SystemLogSortField; direction: SortDirection };
  page: number;
}

/** Filters, sorting and paging live in the URL, so they survive a reload and can be shared. */
export function useSystemLogListParams() {
  const [params, setParams] = useSearchParams();
  const userId = positiveInt(params.get('user'));
  const module = params.get('module') ?? undefined;
  const preset = oneOf(params.get('range'), DATE_RANGE_PRESETS);
  const state: SystemLogListState = {
    search: params.get('q') ?? '',
    module: module && MODULE_PATTERN.test(module) ? module : undefined,
    logLevel: oneOf(params.get('level'), SYSTEM_LOG_LEVELS),
    user: userId ? { id: userId, label: params.get('userName') || `User #${userId}` } : null,
    referenceId: positiveInt(params.get('ref')),
    range:
      preset === 'custom'
        ? {
            preset,
            from: parseDay(params.get('from') ?? undefined)
              ? (params.get('from') ?? '')
              : undefined,
            to: parseDay(params.get('to') ?? undefined) ? (params.get('to') ?? '') : undefined,
          }
        : { preset },
    sort: {
      field: oneOf(params.get('sort'), SYSTEM_LOG_SORT_FIELDS) ?? DEFAULT_SYSTEM_LOG_SORT.field,
      direction:
        oneOf(params.get('dir'), ['asc', 'desc'] as const) ?? DEFAULT_SYSTEM_LOG_SORT.direction,
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
        field === DEFAULT_SYSTEM_LOG_SORT.field && direction === DEFAULT_SYSTEM_LOG_SORT.direction;
      update({ sort: isDefault ? undefined : field, dir: isDefault ? undefined : direction });
    },
    [update],
  );

  const clear = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return { ...state, update, changeSort, clear };
}

/** URL changes that set a user filter, or clear it with `null`. */
export function userParams(user: PickerOption | null): Record<string, string | undefined> {
  return { user: user ? String(user.id) : undefined, userName: user?.label };
}

/** URL changes that set a date range, or clear it with an empty range. */
export function rangeParams(range: DateRange): Record<string, string | undefined> {
  const custom = range.preset === 'custom';
  return {
    range: range.preset,
    from: custom ? range.from : undefined,
    to: custom ? range.to : undefined,
  };
}

export function isDefaultSystemLogSort(sort: SystemLogListState['sort']): boolean {
  return (
    sort.field === DEFAULT_SYSTEM_LOG_SORT.field &&
    sort.direction === DEFAULT_SYSTEM_LOG_SORT.direction
  );
}

/**
 * The API filters for the URL state (without page and size). `now` fixes relative ranges to the
 * day being viewed, so the query key stays stable between renders.
 */
export function toSystemLogFilters(
  list: Omit<SystemLogListState, 'page'>,
  now = new Date(),
): Omit<SystemLogFilters, 'page' | 'size'> {
  return {
    ...searchToFilters(list.search),
    module: list.module,
    logLevel: list.logLevel,
    userId: list.user?.id,
    referenceId: list.referenceId,
    ...rangeToInstants(list.range, now),
    sort: isDefaultSystemLogSort(list.sort)
      ? undefined
      : `${list.sort.field},${list.sort.direction}`,
  };
}
