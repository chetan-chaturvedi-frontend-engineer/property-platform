import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { Modal } from '@/components/common/Modal';
import type { EntityId } from '@/types/common.types';
import { formatDateTime, formatNumber, humanizeCode } from '@/utils/formatters';
import { ROUTES } from '@/utils/constants';

import { usePermissionCatalog, useRole, useRoleMembers } from '../hooks/useRoles';
import { actionLabel } from '../utils/permissionMatrix';
import { ROLE_STATUS_META } from '../utils/roleDisplay';

import { RoleBadges } from './RoleBadges';

const MEMBERS_SHOWN = 10;

interface RoleViewDialogProps {
  /** The role to show; closed when null. */
  id: EntityId | null;
  /** Assigned users come from user management, which needs `USER_LIST`. */
  canListUsers: boolean;
  onClose: () => void;
  /** Shown as an "Edit" action when given. */
  onEdit?: (id: EntityId) => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <Typography variant="caption" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body2" component="dd" className="m-0 break-words">
        {children}
      </Typography>
    </div>
  );
}

/** Read-only summary of a role: details, granted permissions per module and assigned users. */
export function RoleViewDialog({ id, canListUsers, onClose, onEdit }: RoleViewDialogProps) {
  const role = useRole(id);
  const catalog = usePermissionCatalog({ enabled: id !== null });
  const members = useRoleMembers(role.data?.slug ?? null, MEMBERS_SHOWN, {
    enabled: canListUsers && (role.data?.userCount ?? 0) > 0,
  });
  const data = role.data;

  const granted = (catalog.data ?? [])
    .map((module) => ({
      module,
      actions: module.actions.filter(
        (action) => data?.permissions[module.key]?.[action.key] === true,
      ),
    }))
    .filter((entry) => entry.actions.length > 0);

  return (
    <Modal
      open={id !== null}
      title={data ? data.name : 'Role details'}
      onClose={onClose}
      maxWidth="md"
      actions={
        <>
          {onEdit && data && data.manageable && (
            <Button variant="outlined" onClick={() => onEdit(data.id)}>
              Edit
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      {role.isPending && (
        <div aria-busy="true" aria-label="Loading role" className="flex flex-col gap-2">
          <Skeleton width="40%" />
          <Skeleton width="80%" />
          <Skeleton height={120} />
        </div>
      )}
      {role.error && !data && (
        <ErrorState message={role.error.message} onRetry={() => void role.refetch()} />
      )}
      {data && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip
              size="small"
              color={ROLE_STATUS_META[data.status].color}
              label={ROLE_STATUS_META[data.status].label}
            />
            <RoleBadges role={data} />
            {data.superAdmin && <Chip size="small" variant="outlined" label="System managed" />}
          </div>
          <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Role slug">{data.slug}</Field>
            <Field label="Assigned users">{formatNumber(data.userCount)}</Field>
            <Field label="Created on">{formatDateTime(data.createdAt)}</Field>
            <Field label="Last updated">{formatDateTime(data.updatedAt)}</Field>
            <div className="sm:col-span-2">
              <Field label="Description">{data.description ?? '—'}</Field>
            </div>
          </dl>

          <Divider />
          <section aria-labelledby="role-view-permissions">
            <Typography
              id="role-view-permissions"
              variant="subtitle2"
              component="h3"
              className="mb-2"
            >
              Assigned permissions
            </Typography>
            {catalog.isPending && <Skeleton height={80} />}
            {!catalog.isPending && granted.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                This role grants no permissions.
              </Typography>
            )}
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {granted.map(({ module, actions }) => (
                <li
                  key={module.key}
                  className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
                >
                  <Typography variant="body2" fontWeight={600} className="shrink-0 sm:w-44">
                    {module.label}
                  </Typography>
                  <span className="flex flex-wrap gap-1">
                    {actions.map((action) => (
                      <Chip
                        key={action.code}
                        size="small"
                        variant="outlined"
                        label={actionLabel(action.key)}
                        title={action.code}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            {data.status === 'inactive' && (
              <Alert severity="warning" className="mt-2">
                The role is inactive, so none of these permissions apply.
              </Alert>
            )}
          </section>

          {data.userCount > 0 && (
            <>
              <Divider />
              <section aria-labelledby="role-view-users">
                <Typography
                  id="role-view-users"
                  variant="subtitle2"
                  component="h3"
                  className="mb-2"
                >
                  Assigned users
                </Typography>
                {!canListUsers && (
                  <Typography variant="body2" color="text.secondary">
                    You need permission to list users to see who holds this role.
                  </Typography>
                )}
                {canListUsers && members.isPending && <Skeleton height={60} />}
                {canListUsers && members.error && (
                  <Alert severity="error">Could not load users. {members.error.message}</Alert>
                )}
                {members.data && (
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {members.data.content.map((member) => (
                      <li
                        key={member.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="min-w-0">
                          <Typography variant="body2" component="span" fontWeight={600}>
                            {member.fullName}
                          </Typography>{' '}
                          <Typography variant="caption" color="text.secondary" component="span">
                            {member.email}
                          </Typography>
                        </span>
                        <Chip size="small" variant="outlined" label={humanizeCode(member.status)} />
                      </li>
                    ))}
                  </ul>
                )}
                {canListUsers && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    component="p"
                    className="mt-2"
                  >
                    {members.data && members.data.totalElements > MEMBERS_SHOWN
                      ? `Showing ${MEMBERS_SHOWN} of ${formatNumber(members.data.totalElements)}. `
                      : ''}
                    Change a user’s role in{' '}
                    <Link component={RouterLink} to={ROUTES.users}>
                      Users
                    </Link>
                    .
                  </Typography>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
