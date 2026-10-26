-- Rollback for db/migration/V202610261300__grant_page_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the page module from the admin role, also where it was changed after the migration.
-- Admin page endpoints then deny every user; pages and the public endpoints are not affected.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'page',
    updated_at = now()
WHERE slug = 'admin'
  AND permissions ? 'page';

DELETE FROM flyway_schema_history WHERE version = '202610261300';
