-- Saved property and recently viewed permissions (security/Permissions): list, add and remove the caller's own
-- entries. Granted to the app user role only. Merged into the role's existing permissions, so other modules and
-- keys already present are untouched; no other role is changed.
-- Rollback: db/rollback/U202611211220__grant_saved_and_viewed_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions
        || jsonb_build_object('saved_property', COALESCE(permissions -> 'saved_property', '{}'::jsonb)
            || '{"list": true, "create": true, "delete": true}'::jsonb)
        || jsonb_build_object('recently_viewed', COALESCE(permissions -> 'recently_viewed', '{}'::jsonb)
            || '{"list": true, "create": true, "delete": true}'::jsonb),
    updated_at = now()
WHERE slug = 'user';
