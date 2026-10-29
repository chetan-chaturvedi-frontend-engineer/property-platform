-- Rollback for db/migration/V202610291010__grant_user_setting_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the user_setting module from the user and admin roles, also where it was changed after the
-- migration. Saved settings and the other modules are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'user_setting',
    updated_at = now()
WHERE slug IN ('user', 'admin')
  AND permissions ? 'user_setting';

DELETE FROM flyway_schema_history WHERE version = '202610291010';
