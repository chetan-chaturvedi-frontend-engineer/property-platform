import { Badge } from '@/components/common/Badge';

import type { UserStatus } from '../types/user.types';
import { USER_STATUS_META } from '../utils/userDisplay';

export function UserStatusChip({ status }: { status: UserStatus }) {
  const meta = USER_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}
