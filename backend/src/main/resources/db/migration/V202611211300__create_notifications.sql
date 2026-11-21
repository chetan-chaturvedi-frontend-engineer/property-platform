-- In-app notifications: short messages for one user (a visit was booked on their property, a listing was reviewed).
-- Created by the server from domain events, never by clients. A row is read once read_at is set; users can delete
-- their own. The data column holds ids for deep links (propertyId, visitId), never personal details.
-- Rollback: db/rollback/U202611211300__create_notifications.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE notifications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type       VARCHAR(40)  NOT NULL,
    title      VARCHAR(150) NOT NULL,
    body       VARCHAR(500) NOT NULL,
    data       JSONB,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Adding a type later = drop and re-create the constraint and update the Java enum.
    CONSTRAINT chk_notifications_type CHECK (type IN ('site_visit_booked', 'property_status_changed')),
    CONSTRAINT chk_notifications_data CHECK (data IS NULL OR jsonb_typeof(data) = 'object')
);

-- A user's list, newest first; also serves the FK check when a user is deleted.
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC, id DESC);
-- The unread badge: only unread rows, so the index stays small however much history there is.
CREATE INDEX idx_notifications_user_unread ON notifications (user_id) WHERE read_at IS NULL;
