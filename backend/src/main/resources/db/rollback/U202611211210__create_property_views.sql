-- Rollback for db/migration/V202611211210__create_property_views.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Drops the table, every user's recently viewed list and the view counts; deploy code that no longer uses it first.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS property_views;

DELETE FROM flyway_schema_history WHERE version = '202611211210';
