-- Rollback for db/migration/V202611221030__index_property_status_changes_activity.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>

SET LOCAL lock_timeout = '5s';

DROP INDEX IF EXISTS idx_property_project_status_changes_action_created_at;
DROP INDEX IF EXISTS idx_property_project_status_changes_created_at;

DELETE FROM flyway_schema_history WHERE version = '202611221030';
