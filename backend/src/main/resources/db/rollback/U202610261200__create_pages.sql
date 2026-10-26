-- Rollback for db/migration/V202610261200__create_pages.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: all pages are deleted. No other table references pages.

SET LOCAL lock_timeout = '5s';

-- Indexes and constraints are dropped with the table.
DROP TABLE IF EXISTS pages;

DELETE FROM flyway_schema_history WHERE version = '202610261200';
