import { useCallback, useMemo } from 'react';

import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';
import { PERMISSIONS } from '@/utils/constants';

import type { LeadSummary } from '../types/lead.types';

/**
 * UI hints that mirror the backend's lead rules (`_ANY` for every lead, the plain permission for the
 * caller's own). They only hide actions; the backend decides, and answers 404 for leads out of scope.
 */
export function useLeadPermissions() {
  const { can } = usePermissions();
  const userId = useAuthStore((state) => state.user?.id);

  const viewAny = can(PERMISSIONS.leadViewAny);
  const view = can(PERMISSIONS.leadView);
  const updateAny = can(PERMISSIONS.leadUpdateAny);
  const update = can(PERMISSIONS.leadUpdate);
  const deleteAny = can(PERMISSIONS.leadDeleteAny);
  const deleteOwn = can(PERMISSIONS.leadDelete);
  const create = can(PERMISSIONS.leadCreate);
  // Assignee search uses the user management list.
  const userList = can(PERMISSIONS.userList);
  const assign = can(PERMISSIONS.leadAssign) && userList;
  // The amenity catalog comes from the property module.
  const amenities = can(PERMISSIONS.propertyViewAny);
  const isOwn = useCallback(
    (lead: Pick<LeadSummary, 'createdBy'>) => lead.createdBy.id === userId,
    [userId],
  );

  const canEdit = useCallback(
    (lead: Pick<LeadSummary, 'createdBy'>) => updateAny || (update && isOwn(lead)),
    [updateAny, update, isOwn],
  );
  const canDelete = useCallback(
    (lead: Pick<LeadSummary, 'createdBy'>) => deleteAny || (deleteOwn && isOwn(lead)),
    [deleteAny, deleteOwn, isOwn],
  );

  return useMemo(
    () => ({
      canView: viewAny || view,
      canCreate: create,
      canEditSome: updateAny || update,
      canDeleteSome: deleteAny || deleteOwn,
      canAssign: assign,
      canFilterByAssignee: userList,
      canPickAmenities: amenities,
      canEdit,
      canDelete,
    }),
    [
      viewAny,
      view,
      create,
      updateAny,
      update,
      deleteAny,
      deleteOwn,
      assign,
      userList,
      amenities,
      canEdit,
      canDelete,
    ],
  );
}
