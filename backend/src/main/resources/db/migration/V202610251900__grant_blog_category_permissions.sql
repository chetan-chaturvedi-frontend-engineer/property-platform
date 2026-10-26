-- Blog category management permissions (BLOG_CATEGORY_VIEW, _CREATE, _UPDATE, _DELETE in
-- security/Permissions), granted to the admin role only. view covers both the list and the detail.
-- Merged into the role's existing permissions, so other modules are untouched; no other role
-- (super-admin, user, custom roles) gets them.
-- Rollback: db/rollback/U202610251900__grant_blog_category_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions || jsonb_build_object('blog_category',
        COALESCE(permissions -> 'blog_category', '{}'::jsonb)
        || '{"view": true, "create": true, "update": true, "delete": true}'::jsonb),
    updated_at = now()
WHERE slug = 'admin';
