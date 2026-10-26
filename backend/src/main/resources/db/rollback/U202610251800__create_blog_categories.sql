-- Rollback for db/migration/V202610251800__create_blog_categories.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Roll back U202610251810__create_blogs.sql first; without CASCADE this fails while blogs exists.
-- WARNING: all blog categories (including soft-deleted ones) are deleted; category images in object
-- storage are not touched.

SET LOCAL lock_timeout = '5s';

-- Indexes and constraints are dropped with the table.
DROP TABLE IF EXISTS blog_categories;

DELETE FROM flyway_schema_history WHERE version = '202610251800';
