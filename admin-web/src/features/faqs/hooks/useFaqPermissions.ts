import { useMemo } from 'react';

import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PERMISSIONS } from '@/utils/constants';

/** UI hints that mirror the admin FAQ endpoints. They hide actions; the backend decides. */
export function useFaqPermissions() {
  const { can } = usePermissions();

  const view = can(PERMISSIONS.faqView);
  const create = can(PERMISSIONS.faqCreate);
  const update = can(PERMISSIONS.faqUpdate);
  const publish = can(PERMISSIONS.faqPublish);
  const remove = can(PERMISSIONS.faqDelete);

  return useMemo(
    () => ({
      canView: view,
      canCreate: create,
      // The edit form loads the FAQ first, which needs the view permission.
      canEdit: update && view,
      // Any status change (also creating as published) needs publish on top of create/update.
      canPublish: publish,
      canChangeStatus: update && publish,
      canDelete: remove,
    }),
    [view, create, update, publish, remove],
  );
}

export type FaqPermissions = ReturnType<typeof useFaqPermissions>;
