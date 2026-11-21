-- Notification permissions (security/Permissions): list, mark read and delete the caller's own notifications.
-- Granted to the app user role only. Merged into the role's existing permissions, so other modules and keys already
-- present are untouched; no other role is changed.
-- Rollback: db/rollback/U202611211310__grant_notification_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions
        || jsonb_build_object('notification', COALESCE(permissions -> 'notification', '{}'::jsonb)
            || '{"list": true, "update": true, "delete": true}'::jsonb),
    updated_at = now()
WHERE slug = 'user';
