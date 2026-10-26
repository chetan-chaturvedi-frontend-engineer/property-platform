-- Media metadata for projects and apartment configurations. Files live in object storage; rows
-- hold only a private storage key (file_path) or an https external URL, never file contents.
-- Rows are hard-deleted; deleting the stored object is a separate, asynchronous step.
-- Rollback: db/rollback/U202610251020__create_property_media_tables.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE property_project_media (
    id                   BIGSERIAL PRIMARY KEY,
    property_project_id  BIGINT        NOT NULL REFERENCES property_projects (id) ON DELETE CASCADE,
    media_type           VARCHAR(20)   NOT NULL,
    file_path            TEXT,
    external_url         TEXT,
    -- Display only; never used to build storage keys.
    original_filename    VARCHAR(255),
    mime_type            VARCHAR(100),
    file_size            BIGINT,
    title                VARCHAR(150),
    description          TEXT,
    sort_order           INTEGER       NOT NULL DEFAULT 0,
    is_primary           BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_property_project_media_media_type
        CHECK (media_type IN ('photo', 'video', 'brochure')),
    -- Exactly one source: an uploaded object (with its verified metadata) or an external URL.
    CONSTRAINT chk_property_project_media_source
        CHECK ((file_path IS NULL) <> (external_url IS NULL)
            AND (file_path IS NULL OR (mime_type IS NOT NULL AND file_size IS NOT NULL))),
    -- Relative object key: no leading slash, no "..", no scheme.
    CONSTRAINT chk_property_project_media_file_path
        CHECK (file_path ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$' AND file_path NOT LIKE '%..%'),
    CONSTRAINT chk_property_project_media_external_url CHECK (external_url ~ '^https://'),
    CONSTRAINT chk_property_project_media_file_size CHECK (file_size > 0),
    CONSTRAINT chk_property_project_media_primary CHECK (NOT is_primary OR media_type = 'photo')
);

CREATE INDEX idx_property_project_media_project_type ON property_project_media (property_project_id, media_type);
-- At most one cover photo per project.
CREATE UNIQUE INDEX uq_property_project_media_primary ON property_project_media (property_project_id)
    WHERE is_primary;

CREATE TABLE property_apartment_media (
    id                     BIGSERIAL PRIMARY KEY,
    property_apartment_id  BIGINT        NOT NULL REFERENCES property_apartments (id) ON DELETE CASCADE,
    media_type             VARCHAR(20)   NOT NULL,
    file_path              TEXT,
    external_url           TEXT,
    original_filename      VARCHAR(255),
    mime_type              VARCHAR(100),
    file_size              BIGINT,
    title                  VARCHAR(150),
    description            TEXT,
    sort_order             INTEGER       NOT NULL DEFAULT 0,
    is_primary             BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_property_apartment_media_media_type
        CHECK (media_type IN ('floor_plan_image', 'plan_pdf', 'photo')),
    CONSTRAINT chk_property_apartment_media_source
        CHECK ((file_path IS NULL) <> (external_url IS NULL)
            AND (file_path IS NULL OR (mime_type IS NOT NULL AND file_size IS NOT NULL))),
    CONSTRAINT chk_property_apartment_media_file_path
        CHECK (file_path ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$' AND file_path NOT LIKE '%..%'),
    CONSTRAINT chk_property_apartment_media_external_url CHECK (external_url ~ '^https://'),
    CONSTRAINT chk_property_apartment_media_file_size CHECK (file_size > 0),
    CONSTRAINT chk_property_apartment_media_primary CHECK (NOT is_primary OR media_type <> 'plan_pdf')
);

CREATE INDEX idx_property_apartment_media_apartment_type ON property_apartment_media (property_apartment_id, media_type);
-- At most one primary image per apartment configuration.
CREATE UNIQUE INDEX uq_property_apartment_media_primary ON property_apartment_media (property_apartment_id)
    WHERE is_primary;
