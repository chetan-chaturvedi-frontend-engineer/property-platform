-- Rollback for db/migration/V202611211230__grant_profile_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the profile module from the user role, also where it was changed after the migration. Accounts and the
-- other modules are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'profile',
    updated_at = now()
WHERE slug = 'user'
  AND permissions ? 'profile';

DELETE FROM flyway_schema_history WHERE version = '202611211230';
