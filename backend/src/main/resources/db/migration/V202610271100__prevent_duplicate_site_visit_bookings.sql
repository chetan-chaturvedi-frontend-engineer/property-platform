-- A visitor's account can hold only one upcoming booking per property and slot, so a retried mobile
-- request cannot book the same visit twice. Several visits to one property stay possible (other
-- slots, or once the earlier visit is completed, cancelled or a no-show). Walk-ins without an account
-- (user_id NULL) are not restricted.
-- Rollback: db/rollback/U202610271100__prevent_duplicate_site_visit_bookings.sql

SET LOCAL lock_timeout = '5s';

CREATE UNIQUE INDEX uq_site_visits_active_booking
    ON site_visits (user_id, property_id, visit_date, visit_time)
    WHERE user_id IS NOT NULL AND deleted_at IS NULL AND status IN ('scheduled', 'confirmed', 'rescheduled');
