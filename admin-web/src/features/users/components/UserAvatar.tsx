import { InitialsAvatar } from '@/components/common/InitialsAvatar';

interface UserAvatarProps {
  name: string;
  size?: number;
}

/** Initials avatar; the API has no profile pictures. */
export function UserAvatar({ name, size = 40 }: UserAvatarProps) {
  return <InitialsAvatar name={name} size={size} />;
}
