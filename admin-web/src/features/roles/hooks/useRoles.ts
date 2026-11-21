import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import type { EntityId } from '@/types/common.types';

import { roleService } from '../services/roleService';
import type { CreateRoleRequest, RoleFilters, UpdateRoleRequest } from '../types/role.types';

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (filters: RoleFilters) => [...roleKeys.lists(), filters] as const,
  stats: () => [...roleKeys.all, 'stats'] as const,
  catalog: () => [...roleKeys.all, 'catalog'] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...roleKeys.details(), id] as const,
  members: (slug: string) => [...roleKeys.all, 'members', slug] as const,
};

interface EnabledOption {
  enabled?: boolean;
}

/** A page of roles. The previous page stays visible while the next one loads. */
export function useRoles(filters: RoleFilters, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: roleKeys.list(filters),
    queryFn: ({ signal }) => roleService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRoleStats({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: roleKeys.stats(),
    queryFn: ({ signal }) => roleService.stats(signal),
    enabled,
  });
}

/** The permissions a role can grant; changes only with a backend release. */
export function usePermissionCatalog({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: roleKeys.catalog(),
    queryFn: ({ signal }) => roleService.permissionCatalog(signal),
    staleTime: 30 * 60_000,
    enabled,
  });
}

export function useRole(id: EntityId | null, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: roleKeys.detail(id ?? 0),
    queryFn: ({ signal }) => roleService.get(id ?? 0, signal),
    enabled: enabled && id !== null,
  });
}

/** The first users holding a role, for the view dialog. */
export function useRoleMembers(
  slug: string | null,
  size: number,
  { enabled = true }: EnabledOption = {},
) {
  return useQuery({
    queryKey: [...roleKeys.members(slug ?? ''), size],
    queryFn: ({ signal }) => roleService.members(slug ?? '', size, signal),
    enabled: enabled && slug !== null,
  });
}

// Every write can change counts, flags and other rows, so the whole `roles` key space is refreshed.
const INVALIDATE_ALL = { invalidates: [roleKeys.all] };

export function useCreateRole() {
  return useMutation({
    mutationFn: (request: CreateRoleRequest) => roleService.create(request),
    // The form shows the error inline.
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage: 'Role created.' },
  });
}

export function useUpdateRole() {
  return useMutation({
    mutationFn: ({ id, request }: { id: EntityId; request: UpdateRoleRequest }) =>
      roleService.update(id, request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage: 'Role saved.' },
  });
}

export function useDeleteRole() {
  return useMutation({
    mutationFn: (id: EntityId) => roleService.remove(id),
    // The dialog shows the reason (role in use, default role, ...) inline.
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage: 'Role deleted.' },
  });
}
