import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { EntityId } from '@/types/common.types';

import { systemLogService } from '../services/systemLogService';
import type { SystemLog, SystemLogFilters } from '../types/systemLog.types';

export const systemLogKeys = {
  all: ['system-logs'] as const,
  lists: () => [...systemLogKeys.all, 'list'] as const,
  list: (filters: SystemLogFilters) => [...systemLogKeys.lists(), filters] as const,
  counts: () => [...systemLogKeys.all, 'counts'] as const,
  details: () => [...systemLogKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...systemLogKeys.details(), id] as const,
  users: (search: string) => [...systemLogKeys.all, 'users', search] as const,
};

interface EnabledOption {
  enabled?: boolean;
}

/** A page of system logs. The previous page stays visible while the next one loads. */
export function useSystemLogs(filters: SystemLogFilters, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: systemLogKeys.list(filters),
    queryFn: ({ signal }) => systemLogService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Totals for the overview cards; independent of the list filters. */
export function useSystemLogCounts({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: systemLogKeys.counts(),
    queryFn: ({ signal }) => systemLogService.counts(signal),
    enabled,
  });
}

interface UseSystemLogOptions extends EnabledOption {
  /** The row from the list, shown while the details load. */
  placeholder?: SystemLog;
}

/** One log; `null` loads nothing. Logs never change, so a loaded one stays fresh. */
export function useSystemLog(
  id: EntityId | null,
  { enabled = true, placeholder }: UseSystemLogOptions = {},
) {
  return useQuery({
    queryKey: systemLogKeys.detail(id ?? 0),
    queryFn: ({ signal }) => systemLogService.get(id ?? 0, signal),
    placeholderData: placeholder,
    staleTime: Infinity,
    enabled: enabled && id !== null,
  });
}

/** Accounts matching `search`, for the user filter; needs `USER_LIST`. */
export function useSystemLogUserOptions(search: string, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: systemLogKeys.users(search),
    queryFn: ({ signal }) => systemLogService.users(search, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  });
}
