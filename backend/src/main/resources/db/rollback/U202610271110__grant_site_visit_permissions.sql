-- Rollback for db/migration/V202610271110__grant_site_visit_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the site_visit module from the user and admin roles, also where it was changed after the
-- migration. Site visits and the other modules are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'site_visit',
    updated_at = now()
WHERE slug IN ('user', 'admin')
  AND permissions ? 'site_visit';

DELETE FROM flyway_schema_history WHERE version = '202610271110';
