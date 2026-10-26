-- Planned activities of a lead: calls, follow-ups, meetings and site visits. A rescheduled
-- activity keeps its row (status = 'rescheduled') and points to its replacement through
-- rescheduled_from_id, so the history is never overwritten.
-- Rollback: db/rollback/U202610261410__create_lead_schedules.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE lead_schedules (
    id                   BIGSERIAL PRIMARY KEY,
    -- RESTRICT: leads are soft-deleted; their history must never disappear with them.
    lead_id              BIGINT        NOT NULL REFERENCES leads (id) ON DELETE RESTRICT,
    schedule_type        VARCHAR(20)   NOT NULL,
    title                VARCHAR(150)  NOT NULL,
    description          TEXT,
    scheduled_at         TIMESTAMPTZ   NOT NULL,
    duration_minutes     INTEGER,
    location             VARCHAR(255),
    -- NULL = unassigned. A purged user leaves the activity unassigned.
    assigned_to          BIGINT        REFERENCES users (id) ON DELETE SET NULL,
    -- NULL for system-created activities.
    created_by           BIGINT        REFERENCES users (id) ON DELETE RESTRICT,
    status               VARCHAR(20)   NOT NULL DEFAULT 'pending',
    reminder_at          TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    completion_note      TEXT,
    -- The activity this one replaces; that row has status 'rescheduled'.
    rescheduled_from_id  BIGINT        REFERENCES lead_schedules (id) ON DELETE RESTRICT,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,

    -- An activity is rescheduled at most once; also indexes the FK.
    CONSTRAINT uq_lead_schedules_rescheduled_from_id UNIQUE (rescheduled_from_id),
    CONSTRAINT chk_lead_schedules_schedule_type
        CHECK (schedule_type IN ('call', 'follow_up', 'meeting', 'site_visit', 'video_call', 'other')),
    CONSTRAINT chk_lead_schedules_status
        CHECK (status IN ('pending', 'completed', 'cancelled', 'rescheduled')),
    CONSTRAINT chk_lead_schedules_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT chk_lead_schedules_duration CHECK (duration_minutes BETWEEN 1 AND 1440),
    CONSTRAINT chk_lead_schedules_reminder CHECK (reminder_at <= scheduled_at),
    -- completed_at is set exactly when the activity is completed.
    CONSTRAINT chk_lead_schedules_completed_at CHECK ((status = 'completed') = (completed_at IS NOT NULL)),
    CONSTRAINT chk_lead_schedules_not_self_rescheduled CHECK (rescheduled_from_id <> id)
);

-- A lead's timeline and the FK check on lead delete.
CREATE INDEX idx_lead_schedules_lead_id_scheduled_at ON lead_schedules (lead_id, scheduled_at);
-- An employee's agenda and the FK action when a user row is deleted.
CREATE INDEX idx_lead_schedules_assigned_to_scheduled_at ON lead_schedules (assigned_to, scheduled_at);
CREATE INDEX idx_lead_schedules_created_by ON lead_schedules (created_by);
-- Upcoming/overdue activities by status.
CREATE INDEX idx_lead_schedules_status_scheduled_at ON lead_schedules (status, scheduled_at)
    WHERE deleted_at IS NULL;
-- Reminder job: pending reminders that are due.
CREATE INDEX idx_lead_schedules_reminder_at ON lead_schedules (reminder_at)
    WHERE deleted_at IS NULL AND status = 'pending' AND reminder_at IS NOT NULL;

COMMENT ON COLUMN lead_schedules.scheduled_at IS 'Start of the activity (UTC); may be in the past';
COMMENT ON COLUMN lead_schedules.rescheduled_from_id IS 'Earlier activity this one replaces';
