-- Rollback for db/migration/V202611181010__index_users_admin_list.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>

SET LOCAL lock_timeout = '5s';

DROP INDEX IF EXISTS idx_users_full_name;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_users_status;

DELETE FROM flyway_schema_history WHERE version = '202611181010';
