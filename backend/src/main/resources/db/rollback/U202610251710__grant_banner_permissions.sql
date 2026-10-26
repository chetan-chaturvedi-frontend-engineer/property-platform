-- Rollback for db/migration/V202610251710__grant_banner_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the banner module from the admin role, also where it was changed after the migration.
-- Banner endpoints then deny every user; banners themselves are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'banner',
    updated_at = now()
WHERE slug = 'admin'
  AND permissions ? 'banner';

DELETE FROM flyway_schema_history WHERE version = '202610251710';
