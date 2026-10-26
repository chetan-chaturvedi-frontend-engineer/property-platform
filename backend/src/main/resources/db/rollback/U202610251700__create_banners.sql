-- Rollback for db/migration/V202610251700__create_banners.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: all banners (including soft-deleted ones) are deleted; banner images in object storage
-- are not touched. No other table references banners.

SET LOCAL lock_timeout = '5s';

-- Indexes and constraints are dropped with the table.
DROP TABLE IF EXISTS banners;

DELETE FROM flyway_schema_history WHERE version = '202610251700';
