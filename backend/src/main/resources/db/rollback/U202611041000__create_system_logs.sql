-- Rollback for db/migration/V202611041000__create_system_logs.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Destroys all system logs; export them first if they must be kept.

SET LOCAL lock_timeout = '5s';

DROP TABLE system_logs;
DROP FUNCTION reject_system_logs_change();

DELETE FROM flyway_schema_history WHERE version = '202611041000';
