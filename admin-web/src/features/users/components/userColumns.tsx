import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { formatDateTime } from '@/utils/formatters';

import type { ManagedUser, UserSortField } from '../types/user.types';
import { roleLabel } from '../utils/userDisplay';

import { UserAvatar } from './UserAvatar';
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
        <div className="flex min-w-48 items-center gap-3">
          <UserAvatar name={user.fullName} />
          <div className="min-w-0">
            <Typography variant="body2" fontWeight={600} noWrap>
              {user.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID {user.id}
            </Typography>
          </div>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Email / Phone',
      sortField: 'email',
      cell: (user) => (
        <div className="min-w-0">
          <Typography variant="body2" className="break-all">
            {user.email}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.phone ?? 'No phone'}
          </Typography>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      sortField: 'userType',
      cell: (user) => (
        <span
          className="inline-flex rounded-md bg-primary-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-primary-800 dark:bg-primary-500/15 dark:text-primary-300"
          title={user.role ? undefined : 'No role has this slug, so the user has no permissions'}
        >
          {roleLabel(user)}
          {(!user.role || !user.role.active) && ' (inactive)'}
        </span>
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
      header: 'Last updated',
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
