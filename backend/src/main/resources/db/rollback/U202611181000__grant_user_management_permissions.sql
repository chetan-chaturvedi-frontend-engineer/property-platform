-- Rollback for db/migration/V202611181000__grant_user_management_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the user module from the admin and super-admin roles, also where it was changed after the migration.
-- Users and the other modules are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'user',
    updated_at = now()
WHERE slug IN ('admin', 'super-admin')
  AND permissions ? 'user';

DELETE FROM flyway_schema_history WHERE version = '202611181000';
