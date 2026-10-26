-- Content pages (about-us, privacy-policy, terms-and-conditions, ...), managed by administrators.
-- Public only while status = 'publish'; looked up by slug.
-- Rollback: db/rollback/U202610261200__create_pages.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE pages (
    id                BIGSERIAL PRIMARY KEY,
    heading           VARCHAR(255)  NOT NULL,
    sub_heading       VARCHAR(255),
    -- Generated from the heading or chosen by an admin; same format as blog slugs.
    slug              VARCHAR(255)  NOT NULL,
    -- Rich text / HTML from the admin editor; sanitize with an allow-list before rendering. May be
    -- empty (a system page can be rendered by the client), but never NULL.
    content           TEXT          NOT NULL,
    type              VARCHAR(20)   NOT NULL DEFAULT 'static',
    status            VARCHAR(20)   NOT NULL DEFAULT 'draft',
    meta_title        VARCHAR(255),
    meta_description  TEXT,
    -- Comma-separated keywords, e.g. "privacy, data protection".
    meta_keywords     TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

    -- Also serves the public lookup by slug.
    CONSTRAINT uq_pages_slug UNIQUE (slug),
    CONSTRAINT chk_pages_heading_not_blank CHECK (btrim(heading) <> ''),
    CONSTRAINT chk_pages_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_pages_type CHECK (type IN ('static', 'system')),
    CONSTRAINT chk_pages_status CHECK (status IN ('draft', 'publish'))
);

-- Public pages (status = 'publish' [AND type = ?]) and the admin status filter (leading column).
CREATE INDEX idx_pages_status_type ON pages (status, type);
-- Admin list filtered by type alone.
CREATE INDEX idx_pages_type ON pages (type);

COMMENT ON COLUMN pages.slug IS 'URL key, unique across all pages';
COMMENT ON COLUMN pages.type IS 'static = regular content page; system = page the application relies on';
COMMENT ON COLUMN pages.status IS 'draft = hidden; publish = public';
COMMENT ON COLUMN pages.content IS 'Untrusted HTML; sanitize with an allow-list before rendering';
