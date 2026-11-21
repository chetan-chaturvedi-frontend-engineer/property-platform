-- Rollback for db/migration/V202611211200__create_saved_properties.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Drops the table and every user's saved list; deploy code that no longer uses it first.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS saved_properties;

DELETE FROM flyway_schema_history WHERE version = '202611211200';
