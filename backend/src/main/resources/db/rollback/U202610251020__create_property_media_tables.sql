-- Rollback for db/migration/V202610251020__create_property_media_tables.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Roll back newer property migrations first; without CASCADE this fails while dependents exist.
-- WARNING: all media metadata is deleted; stored objects are not touched.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS property_apartment_media;
DROP TABLE IF EXISTS property_project_media;

DELETE FROM flyway_schema_history WHERE version = '202610251020';
