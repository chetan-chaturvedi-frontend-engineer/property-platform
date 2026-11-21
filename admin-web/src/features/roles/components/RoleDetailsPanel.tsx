import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';

import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/Feedback/EmptyState';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { toApiError } from '@/services/api/apiError';
import type { EntityId } from '@/types/common.types';

import { usePermissionCatalog, useRole } from '../hooks/useRoles';

import { RoleEditor } from './RoleEditor';

interface RoleDetailsPanelProps {
  /** The selected role; null shows a prompt to pick one. */
  id: EntityId | null;
  canUpdate: boolean;
  onDirtyChange: (dirty: boolean) => void;
  /** Clears a selection that no longer exists (e.g. deleted elsewhere). */
  onClearSelection: () => void;
}

/** Loads the selected role and the permission catalog, and hosts the editor. */
export function RoleDetailsPanel({
  id,
  canUpdate,
  onDirtyChange,
  onClearSelection,
}: RoleDetailsPanelProps) {
  const role = useRole(id);
  const catalog = usePermissionCatalog();

  return (
    <Paper component="section" aria-label="Role details" className="min-w-0 p-4 sm:p-6">
      {id === null && (
        <EmptyState
          title="No role selected"
          message="Choose a role to see and edit its permissions."
        />
      )}
      {id !== null && role.isPending && (
        <div aria-busy="true" aria-label="Loading role" className="flex flex-col gap-3">
          <Skeleton width={160} height={28} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </div>
          <Skeleton height={90} />
          <Skeleton height={320} />
        </div>
      )}
      {id !== null &&
        role.error &&
        !role.data &&
        (toApiError(role.error).status === 404 ? (
          <EmptyState
            title="Role not found"
            message="This role no longer exists. It may have been deleted."
            action={
              <Button variant="outlined" onClick={onClearSelection}>
                Show roles
              </Button>
            }
          />
        ) : (
          <ErrorState
            title="Could not load role"
            message={role.error.message}
            onRetry={() => void role.refetch()}
          />
        ))}
      {role.data && (
        <RoleEditor
          // Starts again from the persisted role after every save or outside change.
          key={`${role.data.id}-${role.data.updatedAt}`}
          role={role.data}
          catalog={catalog.data}
          isCatalogLoading={catalog.isPending}
          catalogError={catalog.error}
          onRetryCatalog={() => void catalog.refetch()}
          canUpdate={canUpdate}
          onDirtyChange={onDirtyChange}
        />
      )}
    </Paper>
  );
}
