import { useMemo } from 'react';

import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PERMISSIONS } from '@/utils/constants';

/** UI hints that mirror the admin page endpoints. They hide actions; the backend decides. */
export function useContentPagePermissions() {
  const { can } = usePermissions();

  const view = can(PERMISSIONS.pageView);
  const create = can(PERMISSIONS.pageCreate);
  const update = can(PERMISSIONS.pageUpdate);
  const publish = can(PERMISSIONS.pagePublish);
  const remove = can(PERMISSIONS.pageDelete);

  return useMemo(
    () => ({
      canView: view,
      canCreate: create,
      // The edit form loads the page first, which needs the view permission.
      canEdit: update && view,
      // Any status change (also creating as published) needs publish on top of create/update.
      canPublish: publish,
      canChangeStatus: update && publish,
      canDelete: remove,
    }),
    [view, create, update, publish, remove],
  );
}

export type ContentPagePermissions = ReturnType<typeof useContentPagePermissions>;
