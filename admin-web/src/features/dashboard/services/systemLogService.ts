import type { PickerOption } from '@/components/common/SearchAutocomplete';
import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';
import type { EntityId } from '@/types/common.types';
import { PAGINATION } from '@/utils/constants';

import type { SystemLog, SystemLogCounts, SystemLogFilters } from '../types/systemLog.types';
import { DENIED_MODULE, startOfToday } from '../utils/systemLogDisplay';

const PICKER_PAGE_SIZE = 20;

/** The fields of a user management row the user filter needs. */
interface UserRow {
  id: EntityId;
  fullName: string;
  email: string | null;
}

/** Drops empty filter values so they are not sent as `module=`. */
function toParams(filters: object): Record<string, string | number> {
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

  /**
   * Every log matching the filters, up to `limit`, for the CSV export. There is no export endpoint,
   * so the list is read page by page at the maximum page size.
   */
  async listAll(
    filters: Omit<SystemLogFilters, 'page' | 'size'>,
    {
      limit,
      signal,
      onProgress,
    }: {
      limit: number;
      signal?: AbortSignal;
      onProgress?: (loaded: number, total: number) => void;
    },
  ): Promise<{ rows: SystemLog[]; total: number }> {
    const rows: SystemLog[] = [];
    let page = 0;
    let total = 0;
    do {
      const result = await systemLogService.list(
        { ...filters, page, size: PAGINATION.maxPageSize },
        signal,
      );
      total = result.totalElements;
      rows.push(...result.content);
      onProgress?.(Math.min(rows.length, limit), Math.min(total, limit));
      page += 1;
      if (page >= result.totalPages) break;
    } while (rows.length < limit);
    return { rows: rows.slice(0, limit), total };
  },

  /** Needs `SYSTEM_LOG_VIEW`; the list permission alone does not allow details. */
  async get(id: EntityId, signal?: AbortSignal): Promise<SystemLog> {
    const { data } = await apiClient.get<SystemLog>(API_ENDPOINTS.systemLogs.detail(id), {
      signal,
    });
    return data;
  },

  /**
   * Overview counts. There is no stats endpoint, so each count is the total of a one-row list
   * request, sent in parallel; the backend counts on its indexes, nothing else is downloaded.
   */
  async counts(signal?: AbortSignal): Promise<SystemLogCounts> {
    const totalOf = async (filters: SystemLogFilters) =>
      (await systemLogService.list({ ...filters, page: 0, size: 1 }, signal)).totalElements;
    const [total, today, warnings, denied] = await Promise.all([
      totalOf({}),
      totalOf({ createdFrom: startOfToday().toISOString() }),
      totalOf({ logLevel: 'warning' }),
      totalOf({ module: DENIED_MODULE }),
    ]);
    return { total, today, warnings, denied };
  },

  /** Accounts for the user filter (user management list, needs `USER_LIST`); any status. */
  async users(search: string, signal?: AbortSignal): Promise<PickerOption[]> {
    const { data } = await apiClient.get<PageResponse<UserRow>>(API_ENDPOINTS.users.list, {
      params: toParams({ search, size: PICKER_PAGE_SIZE, sort: 'fullName,asc' }),
      signal,
    });
    return data.content.map((user) => ({
      id: user.id,
      label: user.fullName,
      detail: user.email ?? undefined,
    }));
  },
};
