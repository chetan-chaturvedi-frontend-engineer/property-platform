-- Rollback for db/migration/V202610251600__allow_role_slugs_in_user_type.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Fails (and changes nothing) while users have a user_type other than 'user' or 'admin': move them
-- to one of those first.

SET LOCAL lock_timeout = '5s';

ALTER TABLE users
    DROP CONSTRAINT chk_users_user_type,
    ADD CONSTRAINT chk_users_user_type CHECK (user_type IN ('user', 'admin'));

COMMENT ON COLUMN users.user_type IS 'User classification; access is granted by permissions, not by this value';

DELETE FROM flyway_schema_history WHERE version = '202610251600';
