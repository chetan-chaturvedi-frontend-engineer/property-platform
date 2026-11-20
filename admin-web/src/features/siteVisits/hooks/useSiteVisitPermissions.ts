import { useMemo } from 'react';

import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PERMISSIONS } from '@/utils/constants';

/**
 * UI hints that mirror the admin site-visit endpoints (`_ANY` permissions only). They hide actions;
 * the backend decides. Pickers read other modules' lists, so they also need those list permissions.
 */
export function useSiteVisitPermissions() {
  const { can } = usePermissions();

  const view = can(PERMISSIONS.siteVisitViewAny);
  const create = can(PERMISSIONS.siteVisitCreateAny);
  const update = can(PERMISSIONS.siteVisitUpdateAny);
  const remove = can(PERMISSIONS.siteVisitDeleteAny);
  const assign = can(PERMISSIONS.siteVisitAssignAny);
  const updateStatus = can(PERMISSIONS.siteVisitUpdateStatusAny);
  const submitReport = can(PERMISSIONS.siteVisitSubmitReportAny);
  const userList = can(PERMISSIONS.userList);
  const propertyList = can(PERMISSIONS.propertyListAny);
  const leadList = can(PERMISSIONS.leadListAny);

  return useMemo(
    () => ({
      canView: view,
      // A new visit needs a property, picked from the property list.
      canCreate: create && propertyList,
      // Editing loads the full visit first, which needs the view permission.
      canEdit: update && view,
      canDelete: remove,
      // The agent picker searches the user list.
      canAssign: assign && userList,
      canChangeStatus: updateStatus,
      canSubmitReport: submitReport && view,
      canPickUsers: userList,
      canPickProperties: propertyList,
      canPickLeads: leadList,
      canManageAgents: userList,
    }),
    [
      view,
      create,
      update,
      remove,
      assign,
      updateStatus,
      submitReport,
      userList,
      propertyList,
      leadList,
    ],
  );
}

export type SiteVisitPermissions = ReturnType<typeof useSiteVisitPermissions>;
