import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';
import type { EntityId } from '@/types/common.types';

import type {
  CreateRoleRequest,
  PermissionModule,
  Role,
  RoleFilters,
  RoleMember,
  RoleStats,
  UpdateRoleRequest,
} from '../types/role.types';

/** Drops empty filter values so they are not sent as `status=`. */
function toParams(filters: RoleFilters): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

export const roleService = {
  async list(filters: RoleFilters, signal?: AbortSignal): Promise<PageResponse<Role>> {
    const { data } = await apiClient.get<PageResponse<Role>>(API_ENDPOINTS.roles.list, {
      params: toParams(filters),
      signal,
    });
    return data;
  },

  async stats(signal?: AbortSignal): Promise<RoleStats> {
    const { data } = await apiClient.get<RoleStats>(API_ENDPOINTS.roles.stats, { signal });
    return data;
  },

  async permissionCatalog(signal?: AbortSignal): Promise<PermissionModule[]> {
    const { data } = await apiClient.get<PermissionModule[]>(API_ENDPOINTS.roles.permissions, {
      signal,
    });
    return data;
  },

  async get(id: EntityId, signal?: AbortSignal): Promise<Role> {
    const { data } = await apiClient.get<Role>(API_ENDPOINTS.roles.detail(id), { signal });
    return data;
  },

  async create(request: CreateRoleRequest): Promise<Role> {
    const { data } = await apiClient.post<Role>(API_ENDPOINTS.roles.list, request);
    return data;
  },

  async update(id: EntityId, request: UpdateRoleRequest): Promise<Role> {
    const { data } = await apiClient.patch<Role>(API_ENDPOINTS.roles.detail(id), request);
    return data;
  },

  async remove(id: EntityId): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.roles.detail(id));
  },

  /** Users holding the role, through the user management list (needs `USER_LIST`). */
  async members(
    slug: string,
    size: number,
    signal?: AbortSignal,
  ): Promise<PageResponse<RoleMember>> {
    const { data } = await apiClient.get<PageResponse<RoleMember>>(API_ENDPOINTS.users.list, {
      params: { userType: slug, size, sort: 'fullName,asc' },
      signal,
    });
    return data;
  },
};
