-- Communication history of a lead (calls, messages, meetings, notes). interaction_at is when it
-- happened; created_at is when it was recorded, which may be later.
-- Rollback: db/rollback/U202610261420__create_lead_interactions.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE lead_interactions (
    id                 BIGSERIAL PRIMARY KEY,
    -- RESTRICT: leads are soft-deleted; their history must never disappear with them.
    lead_id            BIGINT        NOT NULL REFERENCES leads (id) ON DELETE RESTRICT,
    type               VARCHAR(20)   NOT NULL,
    note               TEXT,
    -- NULL for system-recorded interactions. RESTRICT keeps who did what.
    interacted_by      BIGINT        REFERENCES users (id) ON DELETE RESTRICT,
    interaction_at     TIMESTAMPTZ   NOT NULL,
    outcome            VARCHAR(30),
    next_follow_up_at  TIMESTAMPTZ,
    duration_seconds   INTEGER,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ,

    CONSTRAINT chk_lead_interactions_type
        CHECK (type IN ('call', 'whatsapp', 'email', 'sms', 'meeting', 'site_visit', 'note', 'other')),
    CONSTRAINT chk_lead_interactions_outcome
        CHECK (outcome IN ('interested', 'not_interested', 'no_answer', 'follow_up_required',
                           'site_visit_planned', 'negotiation', 'converted', 'other')),
    CONSTRAINT chk_lead_interactions_duration CHECK (duration_seconds >= 0)
);

-- A lead's history, newest first, and the FK check on lead delete.
CREATE INDEX idx_lead_interactions_lead_id_interaction_at ON lead_interactions (lead_id, interaction_at DESC);
-- An employee's activity and the FK check when a user row is deleted.
CREATE INDEX idx_lead_interactions_interacted_by_interaction_at
    ON lead_interactions (interacted_by, interaction_at DESC);

COMMENT ON COLUMN lead_interactions.interaction_at IS 'When the interaction happened (UTC), not when it was recorded';
