-- Rollback for db/migration/V202610261400__create_leads.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Roll back U202610261420 and U202610261410 first; without CASCADE this fails while they exist.
-- WARNING: all leads are deleted; users are not touched.

SET LOCAL lock_timeout = '5s';

-- Indexes and constraints are dropped with the table.
DROP TABLE IF EXISTS leads;

DELETE FROM flyway_schema_history WHERE version = '202610261400';
