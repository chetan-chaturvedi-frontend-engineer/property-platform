-- Authentication storage: OTP challenges, login sessions and refresh tokens.
-- Rollback: db/rollback/U202610241800__create_auth_tables.sql

SET LOCAL lock_timeout = '5s';

-- Login by phone requires one account per phone number. Like email, the phone of a soft-deleted
-- user stays reserved: it is never reused or silently restored.
DROP INDEX idx_users_phone;
CREATE UNIQUE INDEX uq_users_phone ON users (phone) WHERE phone IS NOT NULL;

CREATE TABLE otp_challenges (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose         VARCHAR(30)  NOT NULL,
    channel         VARCHAR(10)  NOT NULL,
    -- Normalized email or E.164 phone the code was sent to; the code is only valid for it.
    destination     VARCHAR(255) NOT NULL,
    -- HMAC-SHA256 (hex) of purpose, destination and code, keyed with a server secret.
    otp_hash        VARCHAR(64)  NOT NULL,
    expires_at      TIMESTAMPTZ  NOT NULL,
    -- Verification attempts made, counted before each comparison.
    attempt_count   INT          NOT NULL DEFAULT 0,
    delivery_status VARCHAR(20)  NOT NULL DEFAULT 'pending',
    delivery_attempts INT        NOT NULL DEFAULT 0,
    consumed_at     TIMESTAMPTZ,
    -- Set when a newer challenge for the same user and purpose replaces this one.
    invalidated_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_otp_challenges_purpose
        CHECK (purpose IN ('email_verification', 'phone_verification', 'password_reset')),
    CONSTRAINT chk_otp_challenges_channel CHECK (channel IN ('email', 'sms')),
    CONSTRAINT chk_otp_challenges_delivery_status CHECK (delivery_status IN ('pending', 'sent', 'failed'))
);

-- At most one open challenge per user and purpose, also under concurrent requests.
CREATE UNIQUE INDEX uq_otp_challenges_open ON otp_challenges (user_id, purpose)
    WHERE consumed_at IS NULL AND invalidated_at IS NULL;
-- Per-destination send limits.
CREATE INDEX idx_otp_challenges_destination ON otp_challenges (destination, created_at);
-- Cleanup of expired challenges.
CREATE INDEX idx_otp_challenges_expires_at ON otp_challenges (expires_at);

-- One row per login. Access tokens carry the session id, so revoking the session revokes them.
CREATE TABLE auth_sessions (
    id             UUID PRIMARY KEY,
    user_id        BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at     TIMESTAMPTZ NOT NULL,
    revoked_at     TIMESTAMPTZ,
    revoked_reason VARCHAR(30),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions (expires_at);

-- Rotating refresh tokens; only SHA-256 hashes are stored. A used token presented again means
-- it was stolen, and the whole session is revoked.
CREATE TABLE refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    session_id UUID        NOT NULL REFERENCES auth_sessions (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_session_id ON refresh_tokens (session_id);
