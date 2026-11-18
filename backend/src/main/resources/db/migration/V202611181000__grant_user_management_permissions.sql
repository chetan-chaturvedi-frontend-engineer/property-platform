-- User management permissions (security/Permissions): list, view, create, update, change status and delete
-- accounts on the admin dashboard. Granted to the admin and super-admin roles only, because the module exposes
-- every user's contact details and controls who can sign in. Merged into the roles' existing permissions, so
-- other modules are untouched; the user role and custom roles get nothing.
-- Rollback: db/rollback/U202611181000__grant_user_management_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions || jsonb_build_object('user', COALESCE(permissions -> 'user', '{}'::jsonb)
        || '{"list": true, "view": true, "create": true, "update": true, "change_status": true, "delete": true}'::jsonb),
    updated_at = now()
WHERE slug IN ('admin', 'super-admin');
