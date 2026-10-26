-- Rollback for db/migration/V202610251810__create_blogs.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: all blogs (including soft-deleted ones) are deleted; feature images in object storage are
-- not touched. blog_categories is kept (roll back U202610251800 separately).

SET LOCAL lock_timeout = '5s';

-- Indexes, constraints and the FK to blog_categories are dropped with the table.
DROP TABLE IF EXISTS blogs;

DELETE FROM flyway_schema_history WHERE version = '202610251810';
