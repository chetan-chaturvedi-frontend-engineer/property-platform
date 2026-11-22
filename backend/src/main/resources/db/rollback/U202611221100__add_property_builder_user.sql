-- Rollback for db/migration/V202611221100__add_property_builder_user.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>

SET LOCAL lock_timeout = '5s';

DROP INDEX IF EXISTS idx_property_projects_builder_user;
ALTER TABLE property_projects DROP COLUMN IF EXISTS builder_user_id;

DELETE FROM flyway_schema_history WHERE version = '202611221100';
