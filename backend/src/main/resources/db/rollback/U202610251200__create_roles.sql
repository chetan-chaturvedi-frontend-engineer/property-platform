-- Rollback for db/migration/V202610251200__create_roles.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Roll back V202610251210 (seed) first. WARNING: all roles are deleted; users.user_type values are
-- kept, but no user has any permission until the roles exist again.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS roles;

DELETE FROM flyway_schema_history WHERE version = '202610251200';
