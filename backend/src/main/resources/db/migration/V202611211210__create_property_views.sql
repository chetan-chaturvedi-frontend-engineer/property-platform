-- Property views: which signed-in user opened which published property, how often and when last. Drives the app's
-- "Recently viewed" list and the seller's view counts. One row per user and property; every further view
-- increments view_count and moves last_viewed_at (an upsert), so the table never grows per view.
-- Rollback: db/rollback/U202611211210__create_property_views.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE property_views (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    property_id     BIGINT      NOT NULL REFERENCES property_projects (id) ON DELETE CASCADE,
    view_count      INTEGER     NOT NULL DEFAULT 1,
    first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_property_views_user_property UNIQUE (user_id, property_id),
    CONSTRAINT chk_property_views_count CHECK (view_count >= 1)
);

-- A user's recently viewed list, newest first.
CREATE INDEX idx_property_views_user_last_viewed ON property_views (user_id, last_viewed_at DESC, id DESC);
-- Per-property totals for the owner, and the FK check when a property is deleted.
CREATE INDEX idx_property_views_property_id ON property_views (property_id);
