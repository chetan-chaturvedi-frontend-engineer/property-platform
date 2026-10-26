-- Banner management permissions (BANNER_LIST, _VIEW, _CREATE, _UPDATE, _CHANGE_STATUS, _DELETE in
-- security/Permissions), granted to the admin role only. Merged into its existing permissions, so
-- other modules are untouched; no other role (super-admin, user, custom roles) gets them.
-- Rollback: db/rollback/U202610251710__grant_banner_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions || jsonb_build_object('banner',
        COALESCE(permissions -> 'banner', '{}'::jsonb)
        || '{"list": true, "view": true, "create": true, "update": true, "change_status": true,
             "delete": true}'::jsonb),
    updated_at = now()
WHERE slug = 'admin';
