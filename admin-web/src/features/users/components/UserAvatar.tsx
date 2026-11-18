import Avatar from '@mui/material/Avatar';

import { getInitials } from '@/utils/helpers';

interface UserAvatarProps {
  name: string;
  size?: number;
}

/** Initials avatar; the API has no profile pictures. */
export function UserAvatar({ name, size = 40 }: UserAvatarProps) {
  return (
    <Avatar
      aria-hidden
      className="bg-primary-100 font-semibold text-primary-800 dark:bg-primary-500/15 dark:text-primary-300"
      sx={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {getInitials(name)}
    </Avatar>
  );
}
