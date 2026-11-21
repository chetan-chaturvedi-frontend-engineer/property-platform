-- Own-account permissions (security/Permissions): rename, change the password and delete the caller's own account.
-- Granted to the app user role only: staff accounts are managed in the admin dashboard. Merged into the role's
-- existing permissions, so other modules and keys already present are untouched; no other role is changed.
-- Rollback: db/rollback/U202611211230__grant_profile_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions
        || jsonb_build_object('profile', COALESCE(permissions -> 'profile', '{}'::jsonb)
            || '{"update": true, "change_password": true, "delete": true}'::jsonb),
    updated_at = now()
WHERE slug = 'user';
