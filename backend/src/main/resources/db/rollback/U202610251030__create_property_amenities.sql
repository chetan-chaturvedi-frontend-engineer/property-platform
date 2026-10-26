-- Rollback for db/migration/V202610251030__create_property_amenities.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Roll back newer property migrations first; without CASCADE this fails while dependents exist.
-- WARNING: the amenities catalog is deleted.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS property_amenities;

DELETE FROM flyway_schema_history WHERE version = '202610251030';
