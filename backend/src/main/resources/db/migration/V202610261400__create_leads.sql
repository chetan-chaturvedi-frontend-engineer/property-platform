-- CRM leads: one row per customer enquiry. The same customer may enquire several times, so phone
-- and email are indexed but deliberately not unique. Leads are soft-deleted; their schedules and
-- interactions are kept.
-- Rollback: db/rollback/U202610261400__create_leads.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE leads (
    id                  BIGSERIAL PRIMARY KEY,
    -- NULL for enquiries without a logged-in creator (website form, imports). RESTRICT: users are
    -- soft-deleted; a hard delete must not erase who created a lead.
    created_by          BIGINT         REFERENCES users (id) ON DELETE RESTRICT,
    -- Current owner; NULL = unassigned. A purged user leaves the lead unassigned.
    assigned_to         BIGINT         REFERENCES users (id) ON DELETE SET NULL,
    source              VARCHAR(20)    NOT NULL DEFAULT 'other',
    status              VARCHAR(30)    NOT NULL DEFAULT 'new',
    priority            VARCHAR(10)    NOT NULL DEFAULT 'medium',
    purpose             VARCHAR(10)    NOT NULL,

    lead_name           VARCHAR(150)   NOT NULL,
    -- E.164, same format as users.phone.
    phone               VARCHAR(16)    NOT NULL,
    alternate_phone     VARCHAR(16),
    -- Stored lower-case by the application.
    email               VARCHAR(255),

    -- Requirement
    property_type       VARCHAR(20),
    -- 'studio', '1rk' or a bedroom count such as '2' or '2.5'.
    bhk                 VARCHAR(10),
    budget_min          NUMERIC(14, 2),
    budget_max          NUMERIC(14, 2),
    budget_currency     VARCHAR(3)     NOT NULL DEFAULT 'INR',
    area                NUMERIC(12, 2),
    area_unit           VARCHAR(10),
    -- Free text: one or more localities the customer wants, e.g. "Whitefield, Marathahalli".
    preferred_location  VARCHAR(500),
    -- Where the customer is now (city/locality), not where they want to buy or rent.
    location            VARCHAR(255),
    possession          VARCHAR(20),
    move_in_date        DATE,
    -- Free text, e.g. "ground", "5-10", "high floor".
    floor_preference    VARCHAR(50),
    facing              VARCHAR(10),
    furnishing          VARCHAR(20),
    parking             VARCHAR(20),
    -- JSON array of property_amenities slugs, e.g. ["swimming-pool", "gymnasium"].
    amenities           JSONB,
    loan_required       BOOLEAN        NOT NULL DEFAULT FALSE,
    additional_note     TEXT,

    -- Follow-up tracking, denormalized from lead_interactions/lead_schedules for list filters.
    last_contacted_at   TIMESTAMPTZ,
    next_follow_up_at   TIMESTAMPTZ,
    lost_reason         VARCHAR(500),

    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT chk_leads_source
        CHECK (source IN ('website', 'facebook', 'instagram', 'referral', 'walk_in', 'phone_call', 'other')),
    CONSTRAINT chk_leads_status
        CHECK (status IN ('new', 'contacted', 'interested', 'qualified', 'site_visit_scheduled',
                          'negotiation', 'converted', 'lost', 'on_hold')),
    CONSTRAINT chk_leads_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT chk_leads_purpose CHECK (purpose IN ('buy', 'rent', 'lease', 'sell')),
    CONSTRAINT chk_leads_lead_name_not_blank CHECK (btrim(lead_name) <> ''),
    CONSTRAINT chk_leads_phone_e164 CHECK (phone ~ '^\+[1-9][0-9]{6,14}$'),
    CONSTRAINT chk_leads_alternate_phone_e164 CHECK (alternate_phone ~ '^\+[1-9][0-9]{6,14}$'),
    CONSTRAINT chk_leads_property_type
        CHECK (property_type IN ('apartment', 'flat', 'villa', 'independent_house', 'plot',
                                 'commercial', 'office', 'shop', 'other')),
    CONSTRAINT chk_leads_bhk CHECK (bhk ~ '^(studio|1rk|[1-9][0-9]?(\.5)?)$'),
    CONSTRAINT chk_leads_budget
        CHECK (budget_min >= 0 AND budget_max >= 0 AND budget_max >= budget_min),
    CONSTRAINT chk_leads_budget_currency CHECK (budget_currency ~ '^[A-Z]{3}$'),
    -- Same units as property projects (AreaUnit).
    CONSTRAINT chk_leads_area_unit CHECK (area_unit IN ('sq_ft', 'sq_m', 'acre', 'hectare')),
    CONSTRAINT chk_leads_area CHECK (area IS NULL OR (area > 0 AND area_unit IS NOT NULL)),
    CONSTRAINT chk_leads_possession
        CHECK (possession IN ('ready_to_move', 'within_3_months', 'within_6_months', 'within_1_year',
                              'after_1_year', 'flexible')),
    CONSTRAINT chk_leads_facing
        CHECK (facing IN ('north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west')),
    CONSTRAINT chk_leads_furnishing CHECK (furnishing IN ('furnished', 'semi_furnished', 'unfurnished')),
    CONSTRAINT chk_leads_parking CHECK (parking IN ('not_required', 'two_wheeler', 'four_wheeler', 'both')),
    CONSTRAINT chk_leads_amenities CHECK (jsonb_typeof(amenities) = 'array')
);

-- Duplicate-enquiry lookups by contact; include soft-deleted leads.
CREATE INDEX idx_leads_phone ON leads (phone);
CREATE INDEX idx_leads_email ON leads (email) WHERE email IS NOT NULL;
-- "My leads" lists and the FK action when a user row is deleted.
CREATE INDEX idx_leads_assigned_to_status ON leads (assigned_to, status);
CREATE INDEX idx_leads_created_by ON leads (created_by);
-- Admin lists: newest first, optionally filtered by status.
CREATE INDEX idx_leads_status_created_at ON leads (status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created_at ON leads (created_at DESC) WHERE deleted_at IS NULL;
-- Follow-ups due.
CREATE INDEX idx_leads_next_follow_up_at ON leads (next_follow_up_at)
    WHERE deleted_at IS NULL AND next_follow_up_at IS NOT NULL;

COMMENT ON COLUMN leads.assigned_to IS 'Employee currently responsible for the lead; NULL = unassigned';
COMMENT ON COLUMN leads.preferred_location IS 'Localities the customer wants the property in';
COMMENT ON COLUMN leads.location IS 'Where the customer currently is; not the desired property location';
COMMENT ON COLUMN leads.amenities IS 'JSON array of property_amenities slugs, validated by the application';
COMMENT ON COLUMN leads.last_contacted_at IS 'interaction_at of the latest lead_interactions row';
COMMENT ON COLUMN leads.next_follow_up_at IS 'Next planned contact; kept in sync by the application';
