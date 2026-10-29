-- User setting permissions (security/Permissions): view, create and update the caller's own settings. Granted to the
-- app user and admin roles (the admin dashboard keeps its theme and language too). Merged into the roles'
-- existing permissions, so other modules and user_setting keys already present are untouched; no other role
-- (super-admin, custom roles) is changed.
-- Rollback: db/rollback/U202610291010__grant_user_setting_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions
        || jsonb_build_object('user_setting', COALESCE(permissions -> 'user_setting', '{}'::jsonb)
            || '{"view": true, "create": true, "update": true}'::jsonb),
    updated_at = now()
WHERE slug IN ('user', 'admin');
