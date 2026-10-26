-- Rollback for db/migration/V202610261000__create_faqs.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: all FAQs are deleted. No other table references faqs.

SET LOCAL lock_timeout = '5s';

-- Indexes and constraints are dropped with the table.
DROP TABLE IF EXISTS faqs;

DELETE FROM flyway_schema_history WHERE version = '202610261000';
