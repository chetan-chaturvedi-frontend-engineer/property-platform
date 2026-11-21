import { useMemo } from 'react';

import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PERMISSIONS } from '@/utils/constants';

/** UI hints that mirror the admin role endpoints. They hide actions; the backend decides. */
export function useRolePermissions() {
  const { can } = usePermissions();

  const view = can(PERMISSIONS.roleView);
  const create = can(PERMISSIONS.roleCreate);
  const update = can(PERMISSIONS.roleUpdate);
  const remove = can(PERMISSIONS.roleDelete);
  const listUsers = can(PERMISSIONS.userList);

  return useMemo(
    () => ({
      canView: view,
      canCreate: create,
      canUpdate: update,
      canDelete: remove,
      /** Assigned users come from the user management list. */
      canListUsers: listUsers,
    }),
    [view, create, update, remove, listUsers],
  );
}

export type RolePermissionFlags = ReturnType<typeof useRolePermissions>;
