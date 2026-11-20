import { useMemo } from 'react';

import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PERMISSIONS } from '@/utils/constants';

/** UI hints that mirror the admin banner endpoints. They hide actions; the backend decides. */
export function useBannerPermissions() {
  const { can } = usePermissions();

  const view = can(PERMISSIONS.bannerView);
  const create = can(PERMISSIONS.bannerCreate);
  const update = can(PERMISSIONS.bannerUpdate);
  const changeStatus = can(PERMISSIONS.bannerChangeStatus);
  const remove = can(PERMISSIONS.bannerDelete);
  const viewPages = can(PERMISSIONS.pageView);
  const viewActivity = can(PERMISSIONS.systemLogList);

  return useMemo(
    () => ({
      canView: view,
      canCreate: create,
      // The edit form loads the banner first, which needs the view permission.
      canEdit: update && view,
      // List rows carry the full banner; the copy downloads the image with the view permission.
      canDuplicate: create && view,
      // `PATCH` with a status needs both.
      canChangeStatus: update && changeStatus,
      canDelete: remove,
      canPickContentPages: viewPages,
      canViewActivity: viewActivity,
    }),
    [view, create, update, changeStatus, remove, viewPages, viewActivity],
  );
}

export type BannerPermissions = ReturnType<typeof useBannerPermissions>;
