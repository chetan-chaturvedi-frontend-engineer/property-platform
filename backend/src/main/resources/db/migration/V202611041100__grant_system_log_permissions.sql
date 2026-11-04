-- System log permissions (security/Permissions): list, view and create logs on the admin dashboard. Granted to the
-- admin and super-admin roles only, because logs hold personal data of every user. Merged into the roles' existing
-- permissions, so other modules are untouched; the user role and custom roles get nothing.
-- Rollback: db/rollback/U202611041100__grant_system_log_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions || jsonb_build_object('system_log', COALESCE(permissions -> 'system_log', '{}'::jsonb)
        || '{"list": true, "view": true, "create": true}'::jsonb),
    updated_at = now()
WHERE slug IN ('admin', 'super-admin');
