-- Rollback for db/migration/V202611221000__create_conversations_and_messages.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Drops both tables and every conversation; deploy code that no longer uses them first.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;

DELETE FROM flyway_schema_history WHERE version = '202611221000';
