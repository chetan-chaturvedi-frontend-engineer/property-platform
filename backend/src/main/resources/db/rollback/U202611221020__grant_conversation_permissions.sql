-- Rollback for db/migration/V202611221020__grant_conversation_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the conversation and message modules from the user role, also where they were changed after the migration.
-- Conversations and the other modules are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'conversation' - 'message',
    updated_at = now()
WHERE slug = 'user'
  AND (permissions ? 'conversation' OR permissions ? 'message');

DELETE FROM flyway_schema_history WHERE version = '202611221020';
