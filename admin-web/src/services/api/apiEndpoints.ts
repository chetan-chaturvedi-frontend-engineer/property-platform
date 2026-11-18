import type { EntityId } from '@/types/common.types';

/** Paths relative to the API base URL (`env.apiBaseUrl`, e.g. `/api/v1`). */
export const API_ENDPOINTS = {
  auth: {
    register: '/auth/register',
  },
  admin: {
    login: '/admin/login',
    refresh: '/admin/refresh',
    logout: '/admin/logout',
    me: '/admin/me',
    csrf: '/admin/csrf',
  },
  systemLogs: {
    list: '/admin/system-logs',
    detail: (id: EntityId) => `/admin/system-logs/${id}`,
  },
  users: {
    list: '/admin/users',
    stats: '/admin/users/stats',
    roles: '/admin/users/roles',
    detail: (id: EntityId) => `/admin/users/${id}`,
  },
} as const;
