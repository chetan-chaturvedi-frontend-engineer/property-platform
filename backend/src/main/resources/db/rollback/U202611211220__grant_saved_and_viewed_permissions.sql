-- Rollback for db/migration/V202611211220__grant_saved_and_viewed_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the saved_property and recently_viewed modules from the user role, also where they were changed after
-- the migration. Saved properties, views and the other modules are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'saved_property' - 'recently_viewed',
    updated_at = now()
WHERE slug = 'user'
  AND (permissions ? 'saved_property' OR permissions ? 'recently_viewed');

DELETE FROM flyway_schema_history WHERE version = '202611211220';
