-- Rollback for db/migration/V202610261410__create_lead_schedules.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: all lead schedules are deleted; leads and users are not touched.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS lead_schedules;

DELETE FROM flyway_schema_history WHERE version = '202610261410';
