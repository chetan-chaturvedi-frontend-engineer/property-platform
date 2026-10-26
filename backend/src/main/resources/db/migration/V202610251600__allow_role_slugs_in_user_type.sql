-- users.user_type references roles.slug, so it must accept any role slug (e.g. 'manager'), not only
-- 'user' and 'admin'. The fixed list is replaced by the same format rule as chk_roles_slug_format.
-- Access never depends on the value itself: it comes from the matching role's permissions, and a
-- value without an active role grants nothing.
-- Rollback: db/rollback/U202610251600__allow_role_slugs_in_user_type.sql

SET LOCAL lock_timeout = '5s';

-- Every existing value ('user', 'admin') already matches, so validation cannot fail.
ALTER TABLE users
    DROP CONSTRAINT chk_users_user_type,
    ADD CONSTRAINT chk_users_user_type CHECK (user_type ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

COMMENT ON COLUMN users.user_type IS 'Slug of the user''s role (roles.slug); access comes from that role''s permissions';
