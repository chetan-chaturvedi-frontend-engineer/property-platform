-- Property projects: one row per builder/owner project; apartment configurations hang off it.
-- Rollback: db/rollback/U202610251000__create_property_projects.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE property_projects (
    id                     BIGSERIAL PRIMARY KEY,
    -- Owner. RESTRICT: users are soft-deleted; a hard delete must not silently remove listings.
    user_id                BIGINT        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    -- Server-generated, stable after creation. Unique across soft-deleted rows too, so old URLs
    -- never point at a different project.
    slug                   VARCHAR(180)  NOT NULL,

    property_type          VARCHAR(20)   NOT NULL,
    project_name           VARCHAR(150)  NOT NULL,
    builder_company_name   VARCHAR(150)  NOT NULL,
    -- Identifiers, not numbers: they contain letters and leading zeros. Not unique (phases share them).
    rera_number            VARCHAR(50),
    gst_number             VARCHAR(15),
    project_email          VARCHAR(255)  NOT NULL,
    -- E.164, same format as users.phone.
    project_phone          VARCHAR(16)   NOT NULL,

    project_address        TEXT          NOT NULL,
    city                   VARCHAR(100)  NOT NULL,
    locality               VARCHAR(100)  NOT NULL,
    pincode                VARCHAR(10)   NOT NULL,
    state                  VARCHAR(100)  NOT NULL,
    landmark               VARCHAR(150),
    -- 6 decimal places ~ 0.1 m.
    latitude               NUMERIC(9, 6),
    longitude              NUMERIC(9, 6),

    total_towers_blocks    INTEGER,
    total_units_flats      INTEGER,
    -- Construction progress; independent of publication_status and legal_approval_status.
    project_status         VARCHAR(30)   NOT NULL DEFAULT 'upcoming',
    -- Changed only by administrators with the matching permission.
    legal_approval_status  VARCHAR(20)   NOT NULL DEFAULT 'pending',

    land_area              NUMERIC(14, 4),
    land_area_unit         VARCHAR(10),
    possession_start_date  DATE,
    possession_end_date    DATE,

    project_description    TEXT,
    -- JSON array of short highlight strings, e.g. ["Lake view", "Near IT park"].
    project_highlights     JSONB,
    three_d_tour_url       TEXT,
    -- Owners move draft -> pending_review; only reviewers publish or reject.
    publication_status     VARCHAR(20)   NOT NULL DEFAULT 'draft',

    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at             TIMESTAMPTZ,

    CONSTRAINT uq_property_projects_slug UNIQUE (slug),
    CONSTRAINT chk_property_projects_slug_format
        CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_property_projects_property_type
        CHECK (property_type IN ('apartment', 'villa', 'commercial')),
    CONSTRAINT chk_property_projects_project_status
        CHECK (project_status IN ('upcoming', 'under_construction', 'ready_to_move', 'completed', 'on_hold', 'cancelled')),
    CONSTRAINT chk_property_projects_legal_approval_status
        CHECK (legal_approval_status IN ('pending', 'approved', 'rejected', 'not_applicable')),
    CONSTRAINT chk_property_projects_publication_status
        CHECK (publication_status IN ('draft', 'pending_review', 'published', 'rejected')),
    CONSTRAINT chk_property_projects_land_area_unit
        CHECK (land_area_unit IN ('sq_ft', 'sq_m', 'acre', 'hectare')),
    CONSTRAINT chk_property_projects_phone_e164
        CHECK (project_phone ~ '^\+[1-9][0-9]{6,14}$'),
    -- A map location needs both coordinates.
    CONSTRAINT chk_property_projects_coordinates
        CHECK ((latitude IS NULL) = (longitude IS NULL)
            AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180),
    CONSTRAINT chk_property_projects_counts
        CHECK (total_towers_blocks >= 0 AND total_units_flats >= 0),
    CONSTRAINT chk_property_projects_land_area
        CHECK (land_area IS NULL OR (land_area > 0 AND land_area_unit IS NOT NULL)),
    CONSTRAINT chk_property_projects_possession_dates
        CHECK (possession_end_date >= possession_start_date),
    CONSTRAINT chk_property_projects_highlights
        CHECK (jsonb_typeof(project_highlights) = 'array')
);

-- Ownership lookups and the FK check when a user row is deleted.
CREATE INDEX idx_property_projects_user_id ON property_projects (user_id);
-- Search filters; soft-deleted projects are never searched.
CREATE INDEX idx_property_projects_property_type ON property_projects (property_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_projects_project_status ON property_projects (project_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_projects_publication_status ON property_projects (publication_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_projects_city ON property_projects (city) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_projects_state ON property_projects (state) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_projects_locality ON property_projects (locality) WHERE deleted_at IS NULL;

COMMENT ON COLUMN property_projects.slug IS 'Server-generated URL key; stable after creation, never reused';
COMMENT ON COLUMN property_projects.project_status IS 'Construction progress; independent of publication and legal approval';
COMMENT ON COLUMN property_projects.legal_approval_status IS 'Set by authorized administrators only';
COMMENT ON COLUMN property_projects.publication_status IS 'Listing workflow; only reviewers set published/rejected';
