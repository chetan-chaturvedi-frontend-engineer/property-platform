-- User settings: one row per user with UI and notification preferences, owned by that user.
-- Rows are created by the user (POST /api/v1/user-settings); fields they omit take the defaults below. Existing
-- users need no backfill. Keep the defaults in sync with user/domain/UserSettings.
-- Rollback: db/rollback/U202610291000__create_user_settings.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE user_settings (
    id                    BIGSERIAL PRIMARY KEY,
    -- Settings are meaningless without the account, so a hard delete of the user removes them. Soft-deleted
    -- users keep their row (users.deleted_at), like the rest of their data.
    user_id               BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- Free text chosen by the user (city or country); NULL = not set.
    location              VARCHAR(150),
    theme                 VARCHAR(10)  NOT NULL DEFAULT 'system',
    -- BCP 47 language tag: language, optionally a region (en, hi, en-US, es-419).
    language              VARCHAR(10)  NOT NULL DEFAULT 'en',
    -- Master switch: when false no notification is sent, whatever the channel switches say.
    notification_enabled  BOOLEAN      NOT NULL DEFAULT TRUE,
    email_notifications   BOOLEAN      NOT NULL DEFAULT TRUE,
    push_notifications    BOOLEAN      NOT NULL DEFAULT TRUE,
    sms_notifications     BOOLEAN      NOT NULL DEFAULT FALSE,
    -- IANA time zone id (Asia/Kolkata). The application checks it against the known zones.
    timezone              VARCHAR(64)  NOT NULL DEFAULT 'UTC',
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- One settings row per user; its index also serves the FK check when a user is deleted.
    CONSTRAINT uq_user_settings_user_id UNIQUE (user_id),
    CONSTRAINT chk_user_settings_location_not_blank CHECK (location IS NULL OR btrim(location) <> ''),
    -- Adding a value later = drop and re-create the constraint; no column or data change.
    CONSTRAINT chk_user_settings_theme CHECK (theme IN ('light', 'dark', 'system')),
    CONSTRAINT chk_user_settings_language CHECK (language ~ '^[a-z]{2,3}(-([A-Z]{2}|[0-9]{3}))?$'),
    CONSTRAINT chk_user_settings_timezone CHECK (timezone ~ '^[A-Za-z][A-Za-z0-9_+/-]{0,63}$')
);

COMMENT ON COLUMN user_settings.language IS 'BCP 47 language tag, e.g. en, hi, en-US';
COMMENT ON COLUMN user_settings.notification_enabled IS 'Master switch over the email, push and SMS switches';
COMMENT ON COLUMN user_settings.timezone IS 'IANA time zone id, e.g. Asia/Kolkata';
