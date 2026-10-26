-- Rollback for db/migration/V202610251010__create_property_apartments.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Roll back newer property migrations first; without CASCADE this fails while dependents exist.
-- WARNING: all apartment configurations are deleted.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS property_apartments;

DELETE FROM flyway_schema_history WHERE version = '202610251010';
