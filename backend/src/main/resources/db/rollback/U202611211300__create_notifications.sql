-- Rollback for db/migration/V202611211300__create_notifications.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Drops the table and every user's notifications; deploy code that no longer uses it first.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS notifications;

DELETE FROM flyway_schema_history WHERE version = '202611211300';
