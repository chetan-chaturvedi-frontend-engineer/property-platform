import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { systemLogService } from '../services/systemLogService';
import type { SystemLogFilters } from '../types/systemLog.types';

export const systemLogKeys = {
  all: ['system-logs'] as const,
  lists: () => [...systemLogKeys.all, 'list'] as const,
  list: (filters: SystemLogFilters) => [...systemLogKeys.lists(), filters] as const,
};

interface UseSystemLogsOptions {
  enabled?: boolean;
}

/** A page of system logs. The previous page stays visible while the next one loads. */
export function useSystemLogs(
  filters: SystemLogFilters,
  { enabled = true }: UseSystemLogsOptions = {},
) {
  return useQuery({
    queryKey: systemLogKeys.list(filters),
    queryFn: ({ signal }) => systemLogService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}
