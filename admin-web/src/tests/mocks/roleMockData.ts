import type { PermissionModule, RolePermissions } from '@/features/roles/types/role.types';

const catalogModule = (
  key: string,
  label: string,
  actions: readonly string[],
): PermissionModule => ({
  key,
  label,
  actions: actions.map((action) => ({ key: action, code: `${key}_${action}`.toUpperCase() })),
});

/** Same modules and actions as the backend's `PermissionCatalog` (mirrors `security/Permissions`). */
export const MOCK_PERMISSION_CATALOG: readonly PermissionModule[] = [
  catalogModule('admin_panel', 'Admin Panel', ['access']),
  catalogModule('role', 'Roles & Permissions', ['view', 'create', 'update', 'delete']),
  catalogModule('user', 'Users', ['list', 'view', 'create', 'update', 'change_status', 'delete']),
  catalogModule('user_setting', 'User Settings', ['view', 'create', 'update']),
  catalogModule('property', 'Properties', [
    'list',
    'view',
    'create',
    'update',
    'delete',
    'list_any',
    'view_any',
    'update_any',
    'delete_any',
    'restore_any',
    'create_without_subscription',
    'review',
    'publish',
    'suspend',
    'legal_review',
  ]),
  catalogModule('lead', 'Leads / Enquiries', [
    'list',
    'view',
    'create',
    'update',
    'delete',
    'list_any',
    'view_any',
    'update_any',
    'delete_any',
    'assign',
    'access_assigned',
  ]),
  catalogModule('lead_schedule', 'Lead Schedules', ['view', 'create', 'update', 'delete']),
  catalogModule('lead_interaction', 'Lead Interactions', ['view', 'create', 'update', 'delete']),
  catalogModule('site_visit', 'Site Visits', [
    'list',
    'view',
    'create',
    'update',
    'update_status',
    'submit_report',
    'assign',
    'access_assigned',
    'list_any',
    'view_any',
    'create_any',
    'update_any',
    'delete_any',
    'assign_any',
    'update_status_any',
    'submit_report_any',
  ]),
  catalogModule('builder_team', 'Builder Teams', [
    'list',
    'view',
    'create',
    'update',
    'delete',
    'assign_role',
    'manage_permissions',
    'manage_status',
    'list_any',
    'view_any',
    'create_any',
    'update_any',
    'delete_any',
  ]),
  catalogModule('builder_team_membership', 'Team Memberships', ['view', 'respond']),
  catalogModule('subscription_plan', 'Packages & Plans', [
    'list',
    'view',
    'create',
    'update',
    'change_status',
  ]),
  catalogModule('banner', 'Banners', [
    'list',
    'view',
    'create',
    'update',
    'change_status',
    'delete',
  ]),
  catalogModule('blog_category', 'Blog Categories', ['view', 'create', 'update', 'delete']),
  catalogModule('blog', 'Blogs', ['view', 'create', 'update', 'delete']),
  catalogModule('faq', 'FAQs', ['view', 'create', 'update', 'publish', 'delete']),
  catalogModule('page', 'Pages', ['view', 'create', 'update', 'publish', 'delete']),
  catalogModule('system_log', 'System Logs', ['list', 'view', 'create']),
];

export const ALL_PERMISSION_CODES: readonly string[] = MOCK_PERMISSION_CATALOG.flatMap((entry) =>
  entry.actions.map((action) => action.code),
);

/** `roles.permissions` JSON for granted codes (only catalog codes, only `true` entries). */
export function permissionsFromCodes(codes: readonly string[]): RolePermissions {
  const permissions: RolePermissions = {};
  for (const entry of MOCK_PERMISSION_CATALOG) {
    const granted = entry.actions.filter((action) => codes.includes(action.code));
    if (granted.length > 0) {
      permissions[entry.key] = Object.fromEntries(granted.map((action) => [action.key, true]));
    }
  }
  return permissions;
}

/**
 * Granted codes of a permissions body, or the first unknown `module.action` (rejected like the backend
 * does) as `{ unknown }`.
 */
export function codesFromPermissions(
  permissions: RolePermissions,
): { codes: string[] } | { unknown: string } {
  const codes: string[] = [];
  for (const [moduleKey, actions] of Object.entries(permissions)) {
    const entry = MOCK_PERMISSION_CATALOG.find((candidate) => candidate.key === moduleKey);
    for (const [actionKey, granted] of Object.entries(actions)) {
      const action = entry?.actions.find((candidate) => candidate.key === actionKey);
      if (!action || typeof granted !== 'boolean') return { unknown: `${moduleKey}.${actionKey}` };
      if (granted) codes.push(action.code);
    }
  }
  return { codes };
}
