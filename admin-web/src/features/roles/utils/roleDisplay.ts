import { slugify } from '@/utils/slug';

import type { Role, RoleStatus } from '../types/role.types';

/** Backend `Role.SLUG_MAX_LENGTH` (same as `users.user_type`). */
export const ROLE_SLUG_MAX_LENGTH = 30;
export const ROLE_NAME_MAX_LENGTH = 100;
export const ROLE_DESCRIPTION_MAX_LENGTH = 500;

export const ROLE_STATUS_META: Record<RoleStatus, { label: string; color: 'success' | 'default' }> =
  {
    active: { label: 'Active', color: 'success' },
    inactive: { label: 'Inactive', color: 'default' },
  };

/** A slug the backend accepts, from a role name. */
export function roleSlugFromName(name: string): string {
  return slugify(name, ROLE_SLUG_MAX_LENGTH);
}

/** Why a role's details cannot be edited by the signed-in admin; null when they can. */
export function detailsLockReason(role: Role, canUpdate: boolean): string | null {
  if (role.superAdmin)
    return 'The Super Admin role is managed by the system and cannot be changed here.';
  if (!canUpdate) return 'You do not have permission to edit roles.';
  if (!role.manageable) {
    return 'This role grants permissions you do not hold, so only an administrator with all of them can change it.';
  }
  return null;
}

/** Why a role's status and permissions are read-only; null when they are editable. */
export function permissionsLockReason(role: Role, canUpdate: boolean): string | null {
  const detailsReason = detailsLockReason(role, canUpdate);
  if (detailsReason) return detailsReason;
  if (role.ownRole) {
    return 'This is your own role. To avoid locking yourself out, its status and permissions can only be changed by another administrator.';
  }
  return null;
}

/** Why a role cannot be deleted; null when the backend would allow it. */
export function deleteBlockReason(role: Role): string | null {
  if (role.superAdmin || role.defaultRole) return 'Default roles cannot be deleted.';
  if (role.ownRole) return 'You cannot delete your own role.';
  if (!role.manageable) return 'This role grants permissions you do not hold.';
  if (role.userCount > 0) {
    return `This role is assigned to ${role.userCount} user${role.userCount === 1 ? '' : 's'}. Assign them another role in Users before deleting it.`;
  }
  return null;
}
