-- Rollback for db/migration/V202610252000__grant_blog_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the blog module from the admin role, also where it was changed after the migration.
-- Admin blog endpoints then deny every user; blogs and the public endpoints are not affected.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'blog',
    updated_at = now()
WHERE slug = 'admin'
  AND permissions ? 'blog';

DELETE FROM flyway_schema_history WHERE version = '202610252000';
