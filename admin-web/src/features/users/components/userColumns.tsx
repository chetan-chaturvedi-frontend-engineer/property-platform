import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { formatDateTime } from '@/utils/formatters';

import type { ManagedUser, UserSortField } from '../types/user.types';

import { UserAvatar } from './UserAvatar';
import { UserRoleBadge } from './UserRoleBadge';
import { UserStatusChip } from './UserStatusChip';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export interface UserRowActions {
  onView?: (user: ManagedUser) => void;
  onEdit?: (user: ManagedUser) => void;
  onDelete?: (user: ManagedUser) => void;
  /** Rows the viewer may edit; all by default. */
  canEdit?: (user: ManagedUser) => boolean;
  /** Rows the viewer may delete (never their own account). */
  canDelete?: (user: ManagedUser) => boolean;
}

type UserColumn = DataTableColumn<ManagedUser> & { sortField?: UserSortField };

/** Only the actions the viewer is permitted to use are passed in, so only those are rendered. */
export function buildUserColumns({
  onView,
  onEdit,
  onDelete,
  canEdit = () => true,
  canDelete = () => true,
}: UserRowActions): UserColumn[] {
  const columns: UserColumn[] = [
    {
      id: 'user',
      header: 'User',
      sortField: 'fullName',
      cell: (user) => (
        <div className="flex min-w-44 items-center gap-3">
          <UserAvatar name={user.fullName} size={36} />
          <div className="min-w-0">
            <Typography variant="body2" fontWeight={600} noWrap title={user.fullName}>
              {user.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="p">
              {user.phone ?? 'No phone'}
            </Typography>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      sortField: 'userType',
      cell: (user) => <UserRoleBadge user={user} />,
    },
    {
      id: 'email',
      header: 'Email',
      sortField: 'email',
      cell: (user) => (
        <Typography variant="body2" noWrap title={user.email} className="max-w-56 xl:max-w-72">
          {user.email}
        </Typography>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortField: 'status',
      cell: (user) => <UserStatusChip status={user.status} />,
    },
    {
      id: 'createdAt',
      header: 'Joined on',
      sortField: 'createdAt',
      cell: (user) => (
        <span title={formatDateTime(user.createdAt)} className="whitespace-nowrap">
          {formatDate(user.createdAt)}
        </span>
      ),
    },
    {
      id: 'updatedAt',
      header: 'Last Active',
      sortField: 'updatedAt',
      cell: (user) => (
        <span className="whitespace-nowrap">
          {user.updatedAt ? formatDateTime(user.updatedAt) : '—'}
        </span>
      ),
    },
  ];

  if (onView || onEdit || onDelete) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (user) => (
        <div className="flex justify-end gap-1">
          {onView && (
            <Tooltip title="View">
              <IconButton
                size="small"
                aria-label={`View ${user.fullName}`}
                onClick={() => onView(user)}
              >
                <VisibilityOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onEdit && canEdit(user) && (
            <Tooltip title="Edit">
              <IconButton
                size="small"
                aria-label={`Edit ${user.fullName}`}
                onClick={() => onEdit(user)}
              >
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && canDelete(user) && (
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                aria-label={`Delete ${user.fullName}`}
                onClick={() => onDelete(user)}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      ),
    });
  }
  return columns;
}
