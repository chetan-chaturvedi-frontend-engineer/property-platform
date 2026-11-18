import type { ManagedUser, UserStatus } from '../types/user.types';

type ChipColor = 'default' | 'success' | 'warning' | 'error' | 'info';

export const USER_STATUS_META: Record<UserStatus, { label: string; color: ChipColor }> = {
  pending: { label: 'Pending', color: 'warning' },
  active: { label: 'Active', color: 'success' },
  suspended: { label: 'Suspended', color: 'error' },
  rejected: { label: 'Rejected', color: 'error' },
  inactive: { label: 'Inactive', color: 'default' },
  closed: { label: 'Closed', color: 'default' },
};

/** The role's name, or the stored slug when no role has it. */
export function roleLabel(user: Pick<ManagedUser, 'role' | 'userType'>): string {
  return user.role?.name ?? user.userType;
}
