import { useMemo } from 'react';

import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PERMISSIONS } from '@/utils/constants';

/** UI hints that mirror the admin plan endpoints. They hide actions; the backend decides. */
export function usePlanPermissions() {
  const { can } = usePermissions();

  const view = can(PERMISSIONS.subscriptionPlanView);
  const create = can(PERMISSIONS.subscriptionPlanCreate);
  const update = can(PERMISSIONS.subscriptionPlanUpdate);
  const changeStatus = can(PERMISSIONS.subscriptionPlanChangeStatus);

  return useMemo(
    () => ({
      canView: view,
      canCreate: create,
      // Editing loads the full plan first, which needs the view permission.
      canEdit: update && view,
      // List rows carry the full plan, so a copy needs no extra read.
      canDuplicate: create,
      canChangeStatus: changeStatus,
    }),
    [view, create, update, changeStatus],
  );
}

export type PlanPermissions = ReturnType<typeof usePlanPermissions>;
