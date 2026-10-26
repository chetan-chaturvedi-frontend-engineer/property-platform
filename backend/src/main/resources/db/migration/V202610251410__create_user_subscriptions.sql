-- User subscriptions to plans. Each row copies the plan's terms (title, price, billing, property
-- limit) when it is created, so later plan edits or deactivation never change an existing
-- subscription. Validity comes from status plus the starts_at/ends_at window.
-- Rollback: db/rollback/U202610251410__create_user_subscriptions.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE user_subscriptions (
    id                      BIGSERIAL PRIMARY KEY,
    -- RESTRICT: subscription history must survive; users are soft-deleted.
    user_id                 BIGINT         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    -- RESTRICT: plans are retired with status = 'inactive', never deleted.
    subscription_plan_id    BIGINT         NOT NULL REFERENCES subscription_plans (id) ON DELETE RESTRICT,
    -- pending = awaiting payment; active = in force between starts_at and ends_at;
    -- cancelled = ended early; expired = term over. An active row past ends_at is already invalid.
    status                  VARCHAR(20)    NOT NULL DEFAULT 'pending',

    -- Plan terms at subscription time.
    plan_title              VARCHAR(100)   NOT NULL,
    price                   NUMERIC(14, 2) NOT NULL,
    currency                VARCHAR(3)     NOT NULL,
    billing_interval        VARCHAR(20)    NOT NULL,
    billing_interval_count  INTEGER        NOT NULL,
    -- Maximum property projects that are not soft-deleted; NULL = unlimited.
    no_of_properties        INTEGER,

    starts_at               TIMESTAMPTZ    NOT NULL,
    -- NULL only for lifetime plans.
    ends_at                 TIMESTAMPTZ,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT chk_user_subscriptions_status CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
    CONSTRAINT chk_user_subscriptions_price CHECK (price >= 0),
    CONSTRAINT chk_user_subscriptions_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_user_subscriptions_billing_interval
        CHECK (billing_interval IN ('month', 'year', 'lifetime')),
    CONSTRAINT chk_user_subscriptions_billing_interval_count
        CHECK (billing_interval_count > 0 AND (billing_interval <> 'lifetime' OR billing_interval_count = 1)),
    CONSTRAINT chk_user_subscriptions_no_of_properties CHECK (no_of_properties >= 0),
    CONSTRAINT chk_user_subscriptions_period
        CHECK ((ends_at IS NULL) = (billing_interval = 'lifetime') AND ends_at > starts_at)
);

-- At most one active row per user, so the subscription in force is never ambiguous. A renewal or
-- upgrade must mark the current row expired or cancelled in the same transaction.
CREATE UNIQUE INDEX uq_user_subscriptions_active_user ON user_subscriptions (user_id) WHERE status = 'active';
-- A user's subscription history and the "has it expired" check.
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions (user_id, ends_at);
-- FK checks when a plan row changes; subscribers of a plan.
CREATE INDEX idx_user_subscriptions_plan_id ON user_subscriptions (subscription_plan_id);

COMMENT ON COLUMN user_subscriptions.status IS 'Lifecycle only; reaching the property limit never changes it';
COMMENT ON COLUMN user_subscriptions.no_of_properties IS 'Property limit copied from the plan; NULL means unlimited';
