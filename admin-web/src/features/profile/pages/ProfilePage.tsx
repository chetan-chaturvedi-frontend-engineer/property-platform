import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { humanizeCode } from '@/utils/formatters';
import { getInitials } from '@/utils/helpers';

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <Typography variant="body2" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography component="dd" className="m-0 break-words">
        {value ?? 'Not provided'}
      </Typography>
    </div>
  );
}

export function ProfilePage() {
  const { data: user, isPending, error, refetch } = useCurrentUser();

  if (error && !user) {
    return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Typography variant="h1">Profile</Typography>
      <Paper className="p-6">
        {isPending || !user ? (
          <div className="flex items-center gap-4" role="status" aria-label="Loading profile">
            <Skeleton variant="circular" width={64} height={64} />
            <div className="flex-1">
              <Skeleton width="40%" />
              <Skeleton width="25%" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              >
                {getInitials(user.fullName)}
              </Avatar>
              <div>
                <Typography variant="h3" component="h2">
                  {user.fullName}
                </Typography>
                <Typography color="text.secondary">{user.role.name}</Typography>
              </div>
            </div>
            <Divider className="my-6" />
            <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail label="Email" value={user.email} />
              <Detail label="Phone" value={user.phone} />
            </dl>
            <Divider className="my-6" />
            <Typography variant="h6" component="h3" className="mb-3">
              Permissions ({user.permissions.length})
            </Typography>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Permissions">
              {user.permissions.map((permission) => (
                <li key={permission}>
                  <Chip size="small" label={humanizeCode(permission)} title={permission} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Paper>
    </div>
  );
}
