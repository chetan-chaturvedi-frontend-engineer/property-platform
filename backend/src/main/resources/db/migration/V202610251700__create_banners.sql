-- Promotional banners for the app and website, managed by administrators. A banner is shown when
-- status = 'active', delete_at IS NULL and now() is inside [start_date, end_date]; a NULL bound is
-- open (no start = live immediately, no end = never expires). The rule lives in BannerRepository.
-- Soft-deleted through delete_at (requested name; mapped explicitly in cms/banner/domain/Banner).
-- Rollback: db/rollback/U202610251700__create_banners.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE banners (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(255)  NOT NULL,
    -- Free-form keys chosen by the product (e.g. promo, announcement / home_top, search_results),
    -- so new ones need no migration. Format only, not a fixed list.
    type        VARCHAR(50)   NOT NULL,
    placement   VARCHAR(100)  NOT NULL,
    -- internal = app/website path such as /properties/42; external = https URL. Both NULL = no link.
    link_type   VARCHAR(20),
    link        VARCHAR(2048),
    -- Object storage key of the banner image, never a public URL or client filename.
    image       TEXT          NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'inactive',
    start_date  TIMESTAMPTZ,
    end_date    TIMESTAMPTZ,
    delete_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_banners_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT chk_banners_type_format CHECK (type ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT chk_banners_placement_format CHECK (placement ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT chk_banners_status CHECK (status IN ('active', 'inactive')),
    CONSTRAINT chk_banners_link_type CHECK (link_type IN ('internal', 'external')),
    CONSTRAINT chk_banners_link_pair CHECK ((link IS NULL) = (link_type IS NULL)),
    -- Internal links are root-relative paths ("//host" would be protocol-relative, i.e. external);
    -- external links are https only, so no javascript:, data: or plain http targets.
    CONSTRAINT chk_banners_link_format
        CHECK ((link_type = 'internal' AND link ~ '^/([^/\s][^\s]*)?$')
            OR (link_type = 'external' AND link ~ '^https://[^\s]+$')),
    -- Relative object key: no leading slash, no "..", no scheme (same rule as property media).
    CONSTRAINT chk_banners_image
        CHECK (image ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$' AND image NOT LIKE '%..%'),
    CONSTRAINT chk_banners_schedule CHECK (end_date > start_date)
);

-- Display query: WHERE placement = ? AND status = 'active' AND delete_at IS NULL
--   AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()).
-- Partial, so it holds only live candidates and stays small however many banners are archived.
CREATE INDEX idx_banners_displayable ON banners (placement, start_date, end_date)
    WHERE status = 'active' AND delete_at IS NULL;
-- Admin list filtered by status, newest first.
CREATE INDEX idx_banners_status_created_at ON banners (status, created_at) WHERE delete_at IS NULL;
-- Admin list filtered by type or placement.
CREATE INDEX idx_banners_type ON banners (type) WHERE delete_at IS NULL;
CREATE INDEX idx_banners_placement ON banners (placement) WHERE delete_at IS NULL;
-- Scheduling views and expiry clean-up ("ended before X", "starting after X").
CREATE INDEX idx_banners_start_date ON banners (start_date) WHERE delete_at IS NULL;
CREATE INDEX idx_banners_end_date ON banners (end_date) WHERE delete_at IS NULL;

COMMENT ON COLUMN banners.status IS 'Admin switch; scheduling uses start_date/end_date and never changes it';
COMMENT ON COLUMN banners.start_date IS 'Inclusive; NULL = eligible immediately';
COMMENT ON COLUMN banners.end_date IS 'Inclusive; NULL = no scheduled expiry';
COMMENT ON COLUMN banners.delete_at IS 'Soft-delete timestamp; NULL = not deleted';
