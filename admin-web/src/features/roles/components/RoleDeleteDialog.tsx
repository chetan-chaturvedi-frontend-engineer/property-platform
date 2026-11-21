import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/common/Modal';
import { toApiError } from '@/services/api/apiError';

import { useDeleteRole } from '../hooks/useRoles';
import type { Role } from '../types/role.types';
import { deleteBlockReason } from '../utils/roleDisplay';

interface RoleDeleteDialogProps {
  role: Role;
  onClose: () => void;
  /** Called after the role was deleted. */
  onDeleted?: (role: Role) => void;
}

/**
 * Confirms deleting a role. Rules the UI already knows (default, own, assigned roles) are explained up
 * front; the backend checks them again and its reason is shown if it refuses.
 */
export function RoleDeleteDialog({ role, onClose, onDeleted }: RoleDeleteDialogProps) {
  const remove = useDeleteRole();
  const [error, setError] = useState<string | null>(null);
  const blocked = deleteBlockReason(role);

  const confirm = () => {
    if (blocked || remove.isPending) {
      onClose();
      return;
    }
    setError(null);
    remove.mutate(role.id, {
      onSuccess: () => {
        onDeleted?.(role);
        onClose();
      },
      onError: (failure) => setError(toApiError(failure).message),
    });
  };

  return (
    <ConfirmDialog
      open
      title={blocked ? 'Role cannot be deleted' : 'Delete role'}
      confirmLabel={blocked ? 'OK' : 'Delete role'}
      destructive={!blocked}
      loading={remove.isPending}
      onCancel={onClose}
      onConfirm={confirm}
      description={
        <div className="flex flex-col gap-3">
          <Typography variant="body2" fontWeight={600} className="break-words">
            {role.name} <span className="font-normal">({role.slug})</span>
          </Typography>
          {blocked ? (
            <Alert severity="warning">{blocked}</Alert>
          ) : (
            <Typography variant="body2">
              Delete this role? It is not assigned to anyone. Its slug stays reserved and cannot be
              used for a new role.
            </Typography>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </div>
      }
    />
  );
}
