import { Badge } from '@/components/common/Badge';

import type { ManagedUser } from '../types/user.types';
import { roleLabel, roleTone } from '../utils/userDisplay';

interface UserRoleBadgeProps {
  user: Pick<ManagedUser, 'role' | 'userType'>;
}

export function UserRoleBadge({ user }: UserRoleBadgeProps) {
  const grantsNothing = !user.role || !user.role.active;
  return (
    <Badge
      tone={roleTone(user)}
      title={
        !user.role
          ? 'No role has this slug, so the user has no permissions'
          : !user.role.active
            ? 'This role is inactive, so the user has no permissions'
            : undefined
      }
    >
      {roleLabel(user)}
      {grantsNothing && ' (inactive)'}
    </Badge>
  );
}
