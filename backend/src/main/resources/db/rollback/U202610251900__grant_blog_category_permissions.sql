-- Rollback for db/migration/V202610251900__grant_blog_category_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the blog_category module from the admin role, also where it was changed after the migration.
-- Blog category endpoints then deny every user; categories themselves are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'blog_category',
    updated_at = now()
WHERE slug = 'admin'
  AND permissions ? 'blog_category';

DELETE FROM flyway_schema_history WHERE version = '202610251900';
