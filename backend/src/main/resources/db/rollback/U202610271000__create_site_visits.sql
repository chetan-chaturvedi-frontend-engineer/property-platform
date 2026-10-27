-- Rollback for db/migration/V202610271000__create_site_visits.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: all site visits are deleted; users, property projects and leads are not touched.

SET LOCAL lock_timeout = '5s';

-- Indexes, constraints and the owned site_visit_code_seq are dropped with the table.
DROP TABLE IF EXISTS site_visits;
DROP SEQUENCE IF EXISTS site_visit_code_seq;

DELETE FROM flyway_schema_history WHERE version = '202610271000';
