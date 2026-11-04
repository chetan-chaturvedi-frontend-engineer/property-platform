-- Rollback for db/migration/V202611041110__index_system_logs_ip_address.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>

SET LOCAL lock_timeout = '5s';

DROP INDEX idx_system_logs_ip_address;

DELETE FROM flyway_schema_history WHERE version = '202611041110';
