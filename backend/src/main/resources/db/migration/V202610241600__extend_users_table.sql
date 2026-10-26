-- Extends users with contact, status, user type, verification, document, notification and
-- soft-delete columns. Rollback: db/rollback/U202610241600__extend_users_table.sql
--
-- Safe on a populated table (PostgreSQL 11+): every new column is nullable or has a constant
-- default, so ADD COLUMN is a metadata-only change with no table rewrite.

-- Fail fast instead of queueing behind long-running transactions and blocking traffic.
SET LOCAL lock_timeout = '5s';

ALTER TABLE users
    -- E.164 format (+<country code><number>, max 15 digits). Not unique: no auth rule requires it yet.
    ADD COLUMN phone                  VARCHAR(16),
    ADD COLUMN status                 VARCHAR(20)  NOT NULL DEFAULT 'pending',
    ADD COLUMN user_type              VARCHAR(30)  NOT NULL DEFAULT 'user',
    -- Verification timestamps: NULL = not verified.
    ADD COLUMN email_verified         TIMESTAMPTZ,
    ADD COLUMN phone_verified         TIMESTAMPTZ,
    -- Storage keys of uploaded documents (object storage), never document contents or numbers.
    ADD COLUMN aadhar_card            VARCHAR(512),
    ADD COLUMN pan_card               VARCHAR(512),
    ADD COLUMN rera_certificate       VARCHAR(512),
    ADD COLUMN gst_certificate        VARCHAR(512),
    ADD COLUMN business_address_proof VARCHAR(512),
    ADD COLUMN driving_license        VARCHAR(512),
    ADD COLUMN company_registration   VARCHAR(512),
    ADD COLUMN moa_aoa                VARCHAR(512),
    -- Single push token (FCM/APNs). Replace with a user_devices table when multi-device push is needed.
    ADD COLUMN notification_token     VARCHAR(512),
    ADD COLUMN notification_status    BOOLEAN      NOT NULL DEFAULT TRUE,
    ADD COLUMN updated_at             TIMESTAMPTZ,
    ADD COLUMN deleted_at             TIMESTAMPTZ;

ALTER TABLE users
    ADD CONSTRAINT chk_users_phone_e164
        CHECK (phone ~ '^\+[1-9][0-9]{6,14}$'),
    -- Adding a value later = drop and re-create the constraint; no column or data change.
    ADD CONSTRAINT chk_users_status
        CHECK (status IN ('pending', 'active', 'suspended', 'rejected', 'inactive', 'closed')),
    -- Classification only; authorization is permission-based (see CLAUDE.md).
    ADD CONSTRAINT chk_users_user_type
        CHECK (user_type IN ('user', 'admin'));

-- Phone lookups (OTP login, duplicate checks).
CREATE INDEX idx_users_phone ON users (phone) WHERE phone IS NOT NULL;
-- Admin user lists filtered by type and status, excluding soft-deleted users.
CREATE INDEX idx_users_type_status ON users (user_type, status) WHERE deleted_at IS NULL;

COMMENT ON COLUMN users.status IS 'Account lifecycle; independent of email/phone/document verification';
COMMENT ON COLUMN users.user_type IS 'User classification; access is granted by permissions, not by this value';
COMMENT ON COLUMN users.notification_token IS 'Single device push token; move to a device table for multi-device support';
