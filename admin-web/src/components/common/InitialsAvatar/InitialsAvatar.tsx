import Avatar, { type AvatarProps } from '@mui/material/Avatar';

import { getInitials } from '@/utils/helpers';

interface InitialsAvatarProps extends Omit<AvatarProps, 'children'> {
  /** Person or company name; its initials are shown. */
  name: string;
  size?: number;
}

/** Circular initials avatar: the default when there is no profile picture or logo. */
export function InitialsAvatar({
  name,
  size = 40,
  className = '',
  sx,
  ...rest
}: InitialsAvatarProps) {
  return (
    <Avatar
      aria-hidden
      {...rest}
      className={`bg-primary-100 font-semibold text-primary-800 dark:bg-primary-500/15 dark:text-primary-300 ${className}`}
      sx={{ width: size, height: size, fontSize: size * 0.38, ...sx }}
    >
      {getInitials(name)}
    </Avatar>
  );
}
