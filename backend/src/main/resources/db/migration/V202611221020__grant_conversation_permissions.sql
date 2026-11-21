-- Conversation and message permissions (security/Permissions): list and start conversations, mark them read, and
-- list and send messages as one of the two participants. Granted to the app user role only. Merged into the role's
-- existing permissions, so other modules and keys already present are untouched; no other role is changed.
-- Rollback: db/rollback/U202611221020__grant_conversation_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions
        || jsonb_build_object('conversation', COALESCE(permissions -> 'conversation', '{}'::jsonb)
            || '{"list": true, "create": true, "update": true}'::jsonb)
        || jsonb_build_object('message', COALESCE(permissions -> 'message', '{}'::jsonb)
            || '{"list": true, "create": true}'::jsonb),
    updated_at = now()
WHERE slug = 'user';
