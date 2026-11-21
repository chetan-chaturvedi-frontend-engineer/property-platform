import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

/** Backend `RoleStatus`. See `backend/docs/api/admin-roles.md`. */
export const ROLE_STATUSES = ['active', 'inactive'] as const;
export type RoleStatus = (typeof ROLE_STATUSES)[number];

/** `roles.permissions`: `{"<module>": {"<action>": true|false}}`; missing or false = not granted. */
export type RolePermissions = Record<string, Record<string, boolean>>;

/** `GET /admin/roles` item and `GET /admin/roles/{id}`. */
export interface Role {
  id: EntityId;
  name: string;
  /** Equals `users.user_type`; immutable. */
  slug: string;
  description: Nullable<string>;
  status: RoleStatus;
  permissions: RolePermissions;
  /** Seeded by migrations; cannot be deleted. */
  defaultRole: boolean;
  /** Managed by migrations only; never changed through the API. */
  superAdmin: boolean;
  /** Non-deleted users holding the role. */
  userCount: number;
  /** The signed-in admin holds every permission of the role, so they may edit it. */
  manageable: boolean;
  /** The signed-in admin's own role: its status and permissions are read-only for them. */
  ownRole: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** An action of the permission catalog. */
export interface PermissionAction {
  /** `roles.permissions` action key, e.g. `list_any`. */
  key: string;
  /** Permission code it grants, e.g. `LEAD_LIST_ANY`. */
  code: string;
}

/** `GET /admin/roles/permissions` item. */
export interface PermissionModule {
  key: string;
  label: string;
  /** In display order. */
  actions: PermissionAction[];
}

/** `GET /admin/roles/stats`. */
export interface RoleStats {
  totalRoles: number;
  activeRoles: number;
  defaultRoles: number;
  totalPermissions: number;
  /** Users whose active role grants admin panel access. */
  adminUsers: number;
}

export type RoleSortField = 'id' | 'name' | 'slug' | 'status' | 'createdAt' | 'updatedAt';

export interface RoleFilters extends PageParams {
  /** Name, slug or description contains. */
  search?: string;
  status?: RoleStatus;
}

export interface CreateRoleRequest {
  name: string;
  slug: string;
  description?: string;
  /** Omitted = active. */
  status?: RoleStatus;
  permissions?: RolePermissions;
}

/** PATCH: omitted fields are kept; `permissions` replaces all of them. */
export interface UpdateRoleRequest {
  name?: string;
  /** `null` clears it. */
  description?: Nullable<string>;
  status?: RoleStatus;
  permissions?: RolePermissions;
}

/** A user holding a role, from `GET /admin/users?userType=<slug>` (only the fields shown here). */
export interface RoleMember {
  id: EntityId;
  fullName: string;
  email: string;
  status: string;
}
