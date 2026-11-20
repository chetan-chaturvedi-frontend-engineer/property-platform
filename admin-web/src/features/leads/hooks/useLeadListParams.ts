import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { SortDirection } from '@/components/common/DataTable/DataTable';

import {
  LEAD_PRIORITIES,
  LEAD_PROPERTY_TYPES,
  LEAD_PURPOSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadSortField,
} from '../types/lead.types';

const SORT_FIELDS: readonly LeadSortField[] = [
  'createdAt',
  'updatedAt',
  'leadName',
  'status',
  'nextFollowUpAt',
  'lastContactedAt',
  'budgetMax',
];

export const DEFAULT_LEAD_SORT: { field: LeadSortField; direction: SortDirection } = {
  field: 'createdAt',
  direction: 'desc',
};

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

function positiveInt(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return parsed > 0 && Number.isSafeInteger(parsed) ? parsed : undefined;
}

/** URL keys of the filter panel, so "clear" knows what to remove. */
export const PANEL_KEYS = [
  'source',
  'priority',
  'purpose',
  'type',
  'assignee',
  'assigneeName',
  'location',
  'from',
  'to',
] as const;

/**
 * Filters, sorting and paging of the leads list live in the URL, so they survive a visit to a lead
 * and the back button, and a filtered view can be shared.
 */
export function useLeadListParams() {
  const [params, setParams] = useSearchParams();
  const assigneeId = positiveInt(params.get('assignee'));
  const state = {
    status: oneOf(params.get('status'), LEAD_STATUSES),
    search: params.get('q') ?? '',
    source: oneOf(params.get('source'), LEAD_SOURCES),
    priority: oneOf(params.get('priority'), LEAD_PRIORITIES),
    purpose: oneOf(params.get('purpose'), LEAD_PURPOSES),
    propertyType: oneOf(params.get('type'), LEAD_PROPERTY_TYPES),
    assignee: assigneeId
      ? { id: assigneeId, fullName: params.get('assigneeName') ?? `User ${assigneeId}` }
      : null,
    preferredLocation: params.get('location') ?? '',
    createdFrom: params.get('from') ?? '',
    createdTo: params.get('to') ?? '',
    sort: {
      field: oneOf(params.get('sort'), SORT_FIELDS) ?? DEFAULT_LEAD_SORT.field,
      direction: oneOf(params.get('dir'), ['asc', 'desc'] as const) ?? DEFAULT_LEAD_SORT.direction,
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

  const clear = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return { ...state, update, clear };
}

export type LeadListParams = ReturnType<typeof useLeadListParams>;
