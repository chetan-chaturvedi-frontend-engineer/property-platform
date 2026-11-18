import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';

import type { SystemLog, SystemLogFilters } from '../types/systemLog.types';

/** Drops empty filter values so they are not sent as `module=`. */
function toParams(filters: SystemLogFilters): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

export const systemLogService = {
  async list(filters: SystemLogFilters, signal?: AbortSignal): Promise<PageResponse<SystemLog>> {
    const { data } = await apiClient.get<PageResponse<SystemLog>>(API_ENDPOINTS.systemLogs.list, {
      params: toParams(filters),
      signal,
    });
    return data;
  },
};
