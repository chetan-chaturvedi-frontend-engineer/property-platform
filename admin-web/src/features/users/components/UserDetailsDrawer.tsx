import Close from '@mui/icons-material/Close';
import Edit from '@mui/icons-material/Edit';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { type ReactNode, useId } from 'react';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import type { EntityId } from '@/types/common.types';
import { formatDateTime } from '@/utils/formatters';

import { useUser } from '../hooks/useUsers';
import type { ManagedUser } from '../types/user.types';
import { roleLabel } from '../utils/userDisplay';

import { UserAvatar } from './UserAvatar';
import { UserStatusChip } from './UserStatusChip';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <Typography variant="body2" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography component="dd" className="m-0 break-words">
        {children}
      </Typography>
    </div>
  );
}

function Verified({ value }: { value: boolean }) {
  return (
    <Chip
      size="small"
      label={value ? 'Verified' : 'Not verified'}
      color={value ? 'success' : 'default'}
      variant="outlined"
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Typography variant="overline" component="h3" color="text.secondary" lineHeight={1.5}>
        {title}
      </Typography>
      <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function UserDetails({ user }: { user: ManagedUser }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <UserAvatar name={user.fullName} size={64} />
        <div className="min-w-0">
          <Typography variant="h5" component="p" className="break-words">
            {user.fullName}
          </Typography>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <UserStatusChip status={user.status} />
            <Typography variant="body2" color="text.secondary">
              {roleLabel(user)} · ID {user.id}
            </Typography>
          </div>
        </div>
      </div>
      <Divider />
      <Section title="Contact">
        <Detail label="Email">{user.email}</Detail>
        <Detail label="Email verification">
          <Verified value={user.emailVerified} />
        </Detail>
        <Detail label="Phone">{user.phone ?? 'Not provided'}</Detail>
        <Detail label="Phone verification">
          <Verified value={user.phoneVerified} />
        </Detail>
      </Section>
      <Divider />
      <Section title="Account">
        <Detail label="Role">
          {roleLabel(user)}
          {!user.role && ' (no matching role: no permissions)'}
          {user.role && !user.role.active && ' (role inactive: no permissions)'}
        </Detail>
        <Detail label="Notifications">{user.notificationsEnabled ? 'On' : 'Off'}</Detail>
      </Section>
      <Divider />
      <Section title="Activity">
        <Detail label="Joined on">{formatDateTime(user.createdAt)}</Detail>
        <Detail label="Last updated">
          {user.updatedAt ? formatDateTime(user.updatedAt) : 'Never'}
        </Detail>
      </Section>
    </div>
  );
}

interface UserDetailsDrawerProps {
  userId: EntityId | null;
  onClose: () => void;
  /** Shown when the viewer may edit the user. */
  onEdit?: (user: ManagedUser) => void;
}

/** Read-only details of one user, loaded from `GET /admin/users/{id}`. */
export function UserDetailsDrawer({ userId, onClose, onEdit }: UserDetailsDrawerProps) {
  const titleId = useId();
  const { data: user, isPending, error, refetch } = useUser(userId);

  return (
    <Drawer
      anchor="right"
      open={userId !== null}
      onClose={onClose}
      slotProps={{
        paper: {
          className: 'w-full sm:w-[480px]',
          role: 'dialog',
          'aria-labelledby': titleId,
        },
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b px-6 py-4">
        <Typography id={titleId} variant="h6" component="h2">
          User details
        </Typography>
        <IconButton aria-label="Close details" onClick={onClose} edge="end">
          <Close />
        </IconButton>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {error && !user ? (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        ) : isPending || !user ? (
          <div role="status" aria-label="Loading user" className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Skeleton variant="circular" width={64} height={64} />
              <div className="flex-1">
                <Skeleton width="60%" />
                <Skeleton width="40%" />
              </div>
            </div>
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={120} />
          </div>
        ) : (
          <UserDetails user={user} />
        )}
      </div>
      {user && onEdit && (
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outlined" startIcon={<Edit />} onClick={() => onEdit(user)}>
            Edit user
          </Button>
        </div>
      )}
    </Drawer>
  );
}
