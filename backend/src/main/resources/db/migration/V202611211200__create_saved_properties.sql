-- Saved properties: a user's shortlist of published properties (the app's "Saved" tab). One row per user and
-- property; saving again is a no-op. Rows are owned by the user and removed with them; a property leaving the
-- public list (unpublished, deleted) keeps its row but is skipped when the shortlist is read.
-- Rollback: db/rollback/U202611211200__create_saved_properties.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE saved_properties (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    property_id BIGINT      NOT NULL REFERENCES property_projects (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Also serves "my shortlist" (user_id prefix) and the FK check when a user is deleted.
    CONSTRAINT uq_saved_properties_user_property UNIQUE (user_id, property_id)
);

-- "How many users saved this property" (seller engagement) and the FK check when a property is deleted.
CREATE INDEX idx_saved_properties_property_id ON saved_properties (property_id);
-- Newest first within a user's shortlist.
CREATE INDEX idx_saved_properties_user_created ON saved_properties (user_id, created_at DESC, id DESC);
