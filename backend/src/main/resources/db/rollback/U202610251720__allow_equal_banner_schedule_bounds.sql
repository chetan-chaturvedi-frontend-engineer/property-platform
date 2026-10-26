-- Rollback for db/migration/V202610251720__allow_equal_banner_schedule_bounds.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Fails while a banner has end_date = start_date; change those banners first.

SET LOCAL lock_timeout = '5s';

ALTER TABLE banners
    DROP CONSTRAINT chk_banners_schedule,
    ADD CONSTRAINT chk_banners_schedule CHECK (end_date > start_date);

DELETE FROM flyway_schema_history WHERE version = '202610251720';
