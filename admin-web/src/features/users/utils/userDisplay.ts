import type { BadgeTone } from '@/components/common/Badge';

import type { ManagedUser, UserStatus } from '../types/user.types';

/**
 * `suspended` is shown as "Blocked": the backend has no separate blocked status, and suspended
 * accounts cannot sign in.
 */
export const USER_STATUS_META: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Blocked', tone: 'errorStrong' },
  rejected: { label: 'Rejected', tone: 'neutral' },
  inactive: { label: 'Inactive', tone: 'error' },
  closed: { label: 'Closed', tone: 'neutral' },
};

/** The role's name, or the stored slug when no role has it. */
export function roleLabel(user: Pick<ManagedUser, 'role' | 'userType'>): string {
  return user.role?.name ?? user.userType;
}

const ROLE_TONES: readonly BadgeTone[] = ['primary', 'info', 'secondary', 'success', 'warning'];

/**
 * A stable color per role slug. Roles are created at runtime, so the tone comes from a hash of the
 * slug: the same role has the same color on every page. Roles without permissions are neutral.
 */
export function roleTone(user: Pick<ManagedUser, 'role' | 'userType'>): BadgeTone {
  if (!user.role || !user.role.active) {
    return 'neutral';
  }
  let hash = 0;
  for (const char of user.userType) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return ROLE_TONES[hash % ROLE_TONES.length] ?? 'primary';
}
