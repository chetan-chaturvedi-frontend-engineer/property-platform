-- Site visits: a visitor's scheduled (and later reported) visit to a property project. The same
-- visitor may book many visits, so mobile and email are deliberately not unique. Visits are
-- soft-deleted and every FK that records history is RESTRICT, so a visit is never lost silently.
-- Rollback: db/rollback/U202610271000__create_site_visits.sql

SET LOCAL lock_timeout = '5s';

-- Feeds visit_code. Starts at six digits so codes sort and read uniformly (SV-100001, ...).
CREATE SEQUENCE site_visit_code_seq START WITH 100001;

CREATE TABLE site_visits (
    id                   BIGSERIAL PRIMARY KEY,
    -- Human-readable reference given to the visitor; never reused.
    visit_code           VARCHAR(20)   NOT NULL DEFAULT 'SV-' || nextval('site_visit_code_seq'),
    -- Builders are users (property_projects.user_id); denormalized from the project for builder-scoped
    -- lists. The application keeps it equal to the project's owner.
    builder_id           BIGINT        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    -- RESTRICT: projects are soft-deleted; a purge must not erase their visit history.
    property_id          BIGINT        NOT NULL REFERENCES property_projects (id) ON DELETE RESTRICT,
    -- Visitor's account; NULL for walk-ins and visits booked by staff for someone without an account.
    user_id              BIGINT        REFERENCES users (id) ON DELETE RESTRICT,
    -- Optional link to the CRM lead this visit belongs to.
    lead_id              BIGINT        REFERENCES leads (id) ON DELETE RESTRICT,
    -- Employee/agent responsible; NULL = unassigned. A purged user leaves the visit unassigned.
    assign_id            BIGINT        REFERENCES users (id) ON DELETE SET NULL,
    -- When assign_id was last set; kept after a purge of the assignee as history.
    assigned_at          TIMESTAMPTZ,
    -- NULL for visits created by the system or a public form.
    scheduled_by         BIGINT        REFERENCES users (id) ON DELETE RESTRICT,

    visit_type           VARCHAR(20)   NOT NULL DEFAULT 'site_visit',
    -- Wall-clock date and time at the property, as agreed with the visitor (not UTC).
    visit_date           DATE          NOT NULL,
    visit_time           TIME          NOT NULL,
    status               VARCHAR(20)   NOT NULL DEFAULT 'scheduled',

    -- Visitor contact, copied at booking time so the visit stays valid if the account changes.
    name                 VARCHAR(150)  NOT NULL,
    -- E.164, same format as users.phone.
    mobile               VARCHAR(16)   NOT NULL,
    -- Stored lower-case by the application.
    email                VARCHAR(255),
    number_of_people     SMALLINT      NOT NULL DEFAULT 1,
    note                 TEXT,

    -- Visit report: filled in during or after the visit.
    actual_visit_date    TIMESTAMPTZ,
    -- Minutes; planned when scheduling, replaced by the actual length in the report.
    duration             INTEGER,
    -- Free text: who accompanied or conducted the visit.
    visited_with         VARCHAR(150),
    interest             VARCHAR(20),
    visit_note           TEXT,
    feedback             TEXT,
    rating               SMALLINT,
    report_submitted_by  BIGINT        REFERENCES users (id) ON DELETE RESTRICT,

    next_follow_up       TIMESTAMPTZ,
    follow_up_note       TEXT,

    cancelled_at         TIMESTAMPTZ,
    cancellation_reason  TEXT,

    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,

    CONSTRAINT uq_site_visits_visit_code UNIQUE (visit_code),
    CONSTRAINT chk_site_visits_visit_code CHECK (visit_code ~ '^SV-[0-9]{6,}$'),
    CONSTRAINT chk_site_visits_visit_type CHECK (visit_type IN ('site_visit', 'virtual_visit', 'revisit')),
    CONSTRAINT chk_site_visits_status
        CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show')),
    CONSTRAINT chk_site_visits_interest CHECK (interest IN ('low', 'medium', 'high', 'not_interested')),
    CONSTRAINT chk_site_visits_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT chk_site_visits_mobile_e164 CHECK (mobile ~ '^\+[1-9][0-9]{6,14}$'),
    CONSTRAINT chk_site_visits_number_of_people CHECK (number_of_people BETWEEN 1 AND 100),
    CONSTRAINT chk_site_visits_duration CHECK (duration BETWEEN 1 AND 1440),
    CONSTRAINT chk_site_visits_rating CHECK (rating BETWEEN 1 AND 5),
    -- actual_visit_date is set exactly when the visit is completed.
    CONSTRAINT chk_site_visits_completed
        CHECK ((status = 'completed') = (actual_visit_date IS NOT NULL)),
    -- cancelled_at is set exactly when the visit is cancelled; a reason only on cancelled visits.
    CONSTRAINT chk_site_visits_cancelled_at CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
    CONSTRAINT chk_site_visits_cancellation_reason
        CHECK (cancellation_reason IS NULL OR status = 'cancelled')
);

-- DROP TABLE also drops the sequence.
ALTER SEQUENCE site_visit_code_seq OWNED BY site_visits.visit_code;

-- Per-party calendars; full indexes so they also serve the FK checks when a parent row is deleted.
CREATE INDEX idx_site_visits_builder_id_visit_date ON site_visits (builder_id, visit_date);
CREATE INDEX idx_site_visits_property_id_visit_date ON site_visits (property_id, visit_date);
CREATE INDEX idx_site_visits_user_id_visit_date ON site_visits (user_id, visit_date);
CREATE INDEX idx_site_visits_assign_id_visit_date ON site_visits (assign_id, visit_date);
CREATE INDEX idx_site_visits_lead_id ON site_visits (lead_id);
CREATE INDEX idx_site_visits_scheduled_by ON site_visits (scheduled_by);
CREATE INDEX idx_site_visits_report_submitted_by ON site_visits (report_submitted_by);
-- Admin lists: by date, optionally filtered by status.
CREATE INDEX idx_site_visits_status_visit_date ON site_visits (status, visit_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_site_visits_visit_date ON site_visits (visit_date, visit_time) WHERE deleted_at IS NULL;
-- Follow-ups due.
CREATE INDEX idx_site_visits_next_follow_up ON site_visits (next_follow_up)
    WHERE deleted_at IS NULL AND next_follow_up IS NOT NULL;
-- Visitor lookups by contact; include soft-deleted visits.
CREATE INDEX idx_site_visits_mobile ON site_visits (mobile);

COMMENT ON COLUMN site_visits.visit_code IS 'Human-readable reference, generated from site_visit_code_seq';
COMMENT ON COLUMN site_visits.builder_id IS 'Owner of property_id at booking time; kept in sync by the application';
COMMENT ON COLUMN site_visits.visit_date IS 'Local date at the property, not UTC';
COMMENT ON COLUMN site_visits.visit_time IS 'Local time at the property, not UTC';
COMMENT ON COLUMN site_visits.actual_visit_date IS 'When the visit actually took place (UTC)';
COMMENT ON COLUMN site_visits.duration IS 'Minutes; planned at booking, actual after the visit';
COMMENT ON COLUMN site_visits.next_follow_up IS 'Next planned contact with the visitor (UTC)';
