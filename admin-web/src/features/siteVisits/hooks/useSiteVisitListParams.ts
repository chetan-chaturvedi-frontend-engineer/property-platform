import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { SortDirection } from '@/components/common/DataTable/DataTable';

import {
  SITE_VISIT_INTERESTS,
  SITE_VISIT_STATUSES,
  SITE_VISIT_TYPES,
  type PickerOption,
  type SiteVisitSortField,
} from '../types/siteVisit.types';

const SORT_FIELDS: readonly SiteVisitSortField[] = [
  'visitDate',
  'createdAt',
  'updatedAt',
  'nextFollowUp',
  'status',
];

export const DEFAULT_SITE_VISIT_SORT: { field: SiteVisitSortField; direction: SortDirection } = {
  field: 'visitDate',
  direction: 'desc',
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

function positiveInt(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return parsed > 0 && Number.isSafeInteger(parsed) ? parsed : undefined;
}

function picker(
  id: number | undefined,
  label: string | null,
  fallback: string,
): PickerOption | null {
  return id ? { id, label: label || `${fallback} ${id}` } : null;
}

/** URL keys of the filter panel, so "reset" knows what to remove. */
export const PANEL_KEYS = [
  'property',
  'propertyName',
  'agent',
  'agentName',
  'type',
  'interest',
] as const;

/**
 * Filters, sorting, paging and the list/calendar view live in the URL, so they survive a reload and
 * the back button, and a filtered view can be shared.
 */
export function useSiteVisitListParams() {
  const [params, setParams] = useSearchParams();
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const month = params.get('month') ?? '';
  const state = {
    view: oneOf(params.get('view'), ['list', 'calendar'] as const) ?? 'list',
    status: oneOf(params.get('status'), SITE_VISIT_STATUSES),
    search: params.get('q') ?? '',
    visitType: oneOf(params.get('type'), SITE_VISIT_TYPES),
    interest: oneOf(params.get('interest'), SITE_VISIT_INTERESTS),
    property: picker(positiveInt(params.get('property')), params.get('propertyName'), 'Property'),
    agent: picker(positiveInt(params.get('agent')), params.get('agentName'), 'User'),
    visitDateFrom: DATE.test(from) ? from : '',
    visitDateTo: DATE.test(to) ? to : '',
    /** `yyyy-MM` shown by the calendar; empty = the current month. */
    month: MONTH.test(month) ? month : '',
    sort: {
      field: oneOf(params.get('sort'), SORT_FIELDS) ?? DEFAULT_SITE_VISIT_SORT.field,
      direction:
        oneOf(params.get('dir'), ['asc', 'desc'] as const) ?? DEFAULT_SITE_VISIT_SORT.direction,
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
            if (value === undefined || value === '' || value === 0) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          if (resetPage && !('page' in changes)) {
            next.delete('page');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  /** Clears every filter but keeps the current view. */
  const clear = useCallback(
    () =>
      setParams(
        (current): Record<string, string> => {
          const view = current.get('view');
          return view ? { view } : {};
        },
        { replace: true },
      ),
    [setParams],
  );

  return { ...state, update, clear };
}

export type SiteVisitListParams = ReturnType<typeof useSiteVisitListParams>;
