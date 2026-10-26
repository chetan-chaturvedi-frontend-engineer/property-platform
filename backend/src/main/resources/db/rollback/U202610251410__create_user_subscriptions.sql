-- Rollback for db/migration/V202610251410__create_user_subscriptions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: all user subscriptions are deleted; users, plans and properties are not touched.
-- Until it is re-applied, no user can create properties.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS user_subscriptions;

DELETE FROM flyway_schema_history WHERE version = '202610251410';
