-- Rollback for db/migration/V202610271100__prevent_duplicate_site_visit_bookings.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Site visits are not touched.

SET LOCAL lock_timeout = '5s';

DROP INDEX IF EXISTS uq_site_visits_active_booking;

DELETE FROM flyway_schema_history WHERE version = '202610271100';
