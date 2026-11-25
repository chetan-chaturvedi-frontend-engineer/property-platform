-- Rollback for db/migration/V202611251400__index_property_projects_coordinates.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>

SET LOCAL lock_timeout = '5s';

DROP INDEX IF EXISTS idx_property_projects_public_coordinates;

DELETE FROM flyway_schema_history WHERE version = '202611251400';
