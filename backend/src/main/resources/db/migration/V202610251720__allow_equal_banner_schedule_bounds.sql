-- Both schedule bounds are inclusive, so end_date may equal start_date (end_date >= start_date).
-- Only relaxes the check: every existing row already satisfies it.
-- Rollback: db/rollback/U202610251720__allow_equal_banner_schedule_bounds.sql

SET LOCAL lock_timeout = '5s';

ALTER TABLE banners
    DROP CONSTRAINT chk_banners_schedule,
    ADD CONSTRAINT chk_banners_schedule CHECK (end_date >= start_date);
