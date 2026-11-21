-- Rollback for db/migration/V202611221010__add_new_message_notification_type.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Deletes the new_message notifications (they would violate the old constraint), then restores it.

SET LOCAL lock_timeout = '5s';

DELETE FROM notifications WHERE type = 'new_message';

ALTER TABLE notifications DROP CONSTRAINT chk_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type
    CHECK (type IN ('site_visit_booked', 'property_status_changed'));

DELETE FROM flyway_schema_history WHERE version = '202611221010';
