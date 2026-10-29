-- Rollback for db/migration/V202610271200__create_builder_teams.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: all builder team memberships are deleted; users and roles are not touched.

SET LOCAL lock_timeout = '5s';

-- Indexes and constraints, including the foreign keys to users, are dropped with the table.
DROP TABLE IF EXISTS builder_teams;

DELETE FROM flyway_schema_history WHERE version = '202610271200';
