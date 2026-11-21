-- Rollback for db/migration/V202611211000__add_roles_description.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Drops the description column, including descriptions edited after the migration.

SET LOCAL lock_timeout = '5s';

ALTER TABLE roles DROP COLUMN IF EXISTS description;

DELETE FROM flyway_schema_history WHERE version = '202611211000';
