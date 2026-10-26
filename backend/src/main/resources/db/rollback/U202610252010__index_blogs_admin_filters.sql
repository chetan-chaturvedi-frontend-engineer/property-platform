-- Rollback for db/migration/V202610252010__index_blogs_admin_filters.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Only drops the two indexes; no data is touched.

SET LOCAL lock_timeout = '5s';

DROP INDEX IF EXISTS idx_blogs_created_at;
DROP INDEX IF EXISTS idx_blogs_published_at;

DELETE FROM flyway_schema_history WHERE version = '202610252010';
