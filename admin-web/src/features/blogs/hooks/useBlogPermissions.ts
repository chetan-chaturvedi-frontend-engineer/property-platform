import { useMemo } from 'react';

import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PERMISSIONS } from '@/utils/constants';

/** UI hints that mirror the admin blog endpoints. They hide actions; the backend decides. */
export function useBlogPermissions() {
  const { can } = usePermissions();

  const view = can(PERMISSIONS.blogView);
  const create = can(PERMISSIONS.blogCreate);
  const update = can(PERMISSIONS.blogUpdate);
  const remove = can(PERMISSIONS.blogDelete);
  const viewCategories = can(PERMISSIONS.blogCategoryView);
  const createCategories = can(PERMISSIONS.blogCategoryCreate);

  return useMemo(
    () => ({
      canView: view,
      canCreate: create,
      // The edit form loads the blog first, which needs the view permission.
      canEdit: update && view,
      // The copy reads the full blog (content) and its image with the view permission.
      canDuplicate: create && view,
      // Publish, unpublish and schedule are `PATCH` updates.
      canChangeStatus: update,
      canDelete: remove,
      canViewCategories: viewCategories,
      canCreateCategories: createCategories,
    }),
    [view, create, update, remove, viewCategories, createCategories],
  );
}

export type BlogPermissions = ReturnType<typeof useBlogPermissions>;
