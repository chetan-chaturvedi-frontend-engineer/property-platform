-- Rollback for db/migration/V202610291000__create_user_settings.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: every user's saved settings are deleted; users are not touched.

SET LOCAL lock_timeout = '5s';

-- Constraints, including the foreign key to users, are dropped with the table.
DROP TABLE IF EXISTS user_settings;

DELETE FROM flyway_schema_history WHERE version = '202610291000';
