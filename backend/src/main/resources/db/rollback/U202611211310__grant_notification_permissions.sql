-- Rollback for db/migration/V202611211310__grant_notification_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the notification module from the user role, also where it was changed after the migration.
-- Notifications and the other modules are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'notification',
    updated_at = now()
WHERE slug = 'user'
  AND permissions ? 'notification';

DELETE FROM flyway_schema_history WHERE version = '202611211310';
