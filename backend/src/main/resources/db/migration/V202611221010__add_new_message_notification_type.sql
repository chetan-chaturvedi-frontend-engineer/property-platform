-- Notifications get a new type: a message from the other side of a conversation. Drops and re-creates the check
-- constraint with the extra value; no column or data change.
-- Rollback: db/rollback/U202611221010__add_new_message_notification_type.sql

SET LOCAL lock_timeout = '5s';

ALTER TABLE notifications DROP CONSTRAINT chk_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type
    CHECK (type IN ('site_visit_booked', 'property_status_changed', 'new_message'));
