-- FAQ management permissions (FAQ_VIEW, _CREATE, _UPDATE, _PUBLISH, _DELETE in security/Permissions),
-- granted to the admin role only. view covers both the admin list and the detail; publish is needed in
-- addition to create/update for any status change; public FAQ endpoints need no permission. Merged
-- into the role's existing permissions, so other modules are untouched; no other role (super-admin,
-- user, custom roles) gets them.
-- Rollback: db/rollback/U202610261100__grant_faq_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions || jsonb_build_object('faq',
        COALESCE(permissions -> 'faq', '{}'::jsonb)
        || '{"view": true, "create": true, "update": true, "publish": true, "delete": true}'::jsonb),
    updated_at = now()
WHERE slug = 'admin';
