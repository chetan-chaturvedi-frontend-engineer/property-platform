import Chip from '@mui/material/Chip';

import type { UserStatus } from '../types/user.types';
import { USER_STATUS_META } from '../utils/userDisplay';

export function UserStatusChip({ status }: { status: UserStatus }) {
  const meta = USER_STATUS_META[status];
  return (
    <Chip
      size="small"
      variant="outlined"
      color={meta.color}
      label={meta.label}
      icon={<span aria-hidden className="ml-2 size-1.5 rounded-full bg-current" />}
      className="font-medium"
    />
  );
}
