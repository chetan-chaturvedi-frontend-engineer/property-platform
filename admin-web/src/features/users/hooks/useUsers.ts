import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import type { EntityId } from '@/types/common.types';

import { userService } from '../services/userService';
import type { CreateUserRequest, UpdateUserRequest, UserFilters } from '../types/user.types';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  stats: () => [...userKeys.all, 'stats'] as const,
  roles: () => [...userKeys.all, 'roles'] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...userKeys.details(), id] as const,
};

interface EnabledOption {
  enabled?: boolean;
}

/** A page of users. The previous page stays visible while the next one loads. */
export function useUsers(filters: UserFilters, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: ({ signal }) => userService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUserStats({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: ({ signal }) => userService.stats(signal),
    enabled,
  });
}

/** Roles from the roles table (users.user_type = roles.slug); rarely change, so cached longer. */
export function useUserRoles({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: userKeys.roles(),
    queryFn: ({ signal }) => userService.roles(signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useUser(id: EntityId | null, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: userKeys.detail(id ?? 0),
    queryFn: ({ signal }) => userService.get(id ?? 0, signal),
    enabled: enabled && id !== null,
  });
}

// Every write changes counts as well as rows, so the whole `users` key space is refreshed.
const INVALIDATE_ALL = { invalidates: [userKeys.all] };

export function useCreateUser() {
  return useMutation({
    mutationFn: (request: CreateUserRequest) => userService.create(request),
    // The form shows the error inline.
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage: 'User created.' },
  });
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: ({ id, request }: { id: EntityId; request: UpdateUserRequest }) =>
      userService.update(id, request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage: 'User updated.' },
  });
}

export function useDeleteUser() {
  return useMutation({
    mutationFn: (id: EntityId) => userService.remove(id),
    meta: { ...INVALIDATE_ALL, successMessage: 'User deleted.' },
  });
}
