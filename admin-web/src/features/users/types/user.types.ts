import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

/** Backend `UserStatus`. See `backend/docs/api/admin-users.md`. */
export const USER_STATUSES = [
  'pending',
  'active',
  'suspended',
  'rejected',
  'inactive',
  'closed',
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Statuses an admin may give a new account. */
export const CREATE_STATUSES = ['pending', 'active', 'inactive'] as const satisfies UserStatus[];
export type CreateUserStatus = (typeof CREATE_STATUSES)[number];

export function isCreateStatus(status: UserStatus): status is CreateUserStatus {
  return (CREATE_STATUSES as readonly UserStatus[]).includes(status);
}

/** The role whose slug equals `users.user_type`. */
export interface UserRoleRef {
  slug: string;
  name: string;
  /** An inactive role grants nothing. */
  active: boolean;
}

/** `GET /admin/users` item and `GET /admin/users/{id}`. */
export interface ManagedUser {
  id: EntityId;
  fullName: string;
  email: string;
  phone: Nullable<string>;
  status: UserStatus;
  /** Role slug stored in `users.user_type`. */
  userType: string;
  /** `null` when no role has that slug: the user has no permissions. */
  role: Nullable<UserRoleRef>;
  emailVerified: boolean;
  phoneVerified: boolean;
  notificationsEnabled: boolean;
  createdAt: IsoDateTime;
  updatedAt: Nullable<IsoDateTime>;
}

/** `GET /admin/users/roles` item: every non-deleted role, for filters and forms. */
export interface UserRoleOption {
  slug: string;
  name: string;
  active: boolean;
  /** The signed-in admin may give this role to a user. */
  assignable: boolean;
}

export type UserSortField =
  'id' | 'createdAt' | 'updatedAt' | 'fullName' | 'email' | 'userType' | 'status';

export interface UserFilters extends PageParams {
  search?: string;
  status?: UserStatus;
  /** Role slug. */
  userType?: string;
  /** ISO date (`YYYY-MM-DD`), inclusive, UTC. */
  createdFrom?: string;
  createdTo?: string;
}

/** `GET /admin/users/stats`. */
export interface UserStats {
  total: number;
  byStatus: Record<UserStatus, number>;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  passwordConfirmation: string;
  userType: string;
  /** Omitted = pending; anything else needs `USER_CHANGE_STATUS`. */
  status?: CreateUserStatus;
  /** Sign-in ready: marks the email as verified. Only with status `active`. */
  emailVerified?: boolean;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  /** `null` clears the phone number. */
  phone?: Nullable<string>;
  userType?: string;
  status?: UserStatus;
}
