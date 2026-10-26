-- Rollback for db/migration/V202610251000__create_property_projects.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Roll back newer property migrations first; without CASCADE this fails while dependents exist.
-- WARNING: all property projects are deleted; users are not touched.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS property_projects;

DELETE FROM flyway_schema_history WHERE version = '202610251000';
