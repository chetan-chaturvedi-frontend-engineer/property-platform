import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';
import type { EntityId } from '@/types/common.types';
import { PAGINATION } from '@/utils/constants';

import type {
  CreateUserRequest,
  ManagedUser,
  UpdateUserRequest,
  UserFilters,
  UserRoleOption,
  UserStats,
} from '../types/user.types';

/** Drops empty filter values so they are not sent as `status=`. */
function toParams(filters: UserFilters): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

export const userService = {
  async list(filters: UserFilters, signal?: AbortSignal): Promise<PageResponse<ManagedUser>> {
    const { data } = await apiClient.get<PageResponse<ManagedUser>>(API_ENDPOINTS.users.list, {
      params: toParams(filters),
      signal,
    });
    return data;
  },

  /** Every user matching the filters, up to `limit`, read page by page (there is no export endpoint). */
  async listAll(
    filters: Omit<UserFilters, 'page' | 'size'>,
    { limit, signal }: { limit: number; signal?: AbortSignal },
  ): Promise<{ rows: ManagedUser[]; total: number }> {
    const rows: ManagedUser[] = [];
    let page = 0;
    let total = 0;
    do {
      const result = await userService.list(
        { ...filters, page, size: PAGINATION.maxPageSize },
        signal,
      );
      total = result.totalElements;
      rows.push(...result.content);
      page += 1;
      if (page >= result.totalPages) break;
    } while (rows.length < limit);
    return { rows: rows.slice(0, limit), total };
  },

  async stats(signal?: AbortSignal): Promise<UserStats> {
    const { data } = await apiClient.get<UserStats>(API_ENDPOINTS.users.stats, { signal });
    return data;
  },

  async roles(signal?: AbortSignal): Promise<UserRoleOption[]> {
    const { data } = await apiClient.get<UserRoleOption[]>(API_ENDPOINTS.users.roles, { signal });
    return data;
  },

  async get(id: EntityId, signal?: AbortSignal): Promise<ManagedUser> {
    const { data } = await apiClient.get<ManagedUser>(API_ENDPOINTS.users.detail(id), { signal });
    return data;
  },

  async create(request: CreateUserRequest): Promise<ManagedUser> {
    const { data } = await apiClient.post<ManagedUser>(API_ENDPOINTS.users.list, request);
    return data;
  },

  async update(id: EntityId, request: UpdateUserRequest): Promise<ManagedUser> {
    const { data } = await apiClient.patch<ManagedUser>(API_ENDPOINTS.users.detail(id), request);
    return data;
  },

  async remove(id: EntityId): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.users.detail(id));
  },
};
