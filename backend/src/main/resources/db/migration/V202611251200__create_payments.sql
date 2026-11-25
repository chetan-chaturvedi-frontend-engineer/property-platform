-- Gateway payments for paid subscription plans (Razorpay). One row per checkout order; the row is
-- marked paid once the payment signature or the gateway webhook is verified, and then links to the
-- subscription it activated. Amounts are copied from the plan when the order is created.
-- Rollback: db/rollback/U202611251200__create_payments.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE payments (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    subscription_plan_id  BIGINT         NOT NULL REFERENCES subscription_plans (id) ON DELETE RESTRICT,
    -- Set when the payment activated a subscription.
    user_subscription_id  BIGINT         REFERENCES user_subscriptions (id) ON DELETE RESTRICT,
    provider              VARCHAR(20)    NOT NULL DEFAULT 'razorpay',
    provider_order_id     VARCHAR(64)    NOT NULL,
    provider_payment_id   VARCHAR(64),
    amount                NUMERIC(14, 2) NOT NULL,
    currency              VARCHAR(3)     NOT NULL,
    status                VARCHAR(20)    NOT NULL DEFAULT 'created',
    paid_at               TIMESTAMPTZ,
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT chk_payments_provider CHECK (provider IN ('razorpay')),
    CONSTRAINT chk_payments_status CHECK (status IN ('created', 'paid', 'failed')),
    CONSTRAINT chk_payments_amount CHECK (amount > 0),
    CONSTRAINT chk_payments_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_payments_paid CHECK ((status = 'paid') = (paid_at IS NOT NULL))
);

CREATE UNIQUE INDEX uq_payments_provider_order ON payments (provider, provider_order_id);
-- One payment id can settle one order only.
CREATE UNIQUE INDEX uq_payments_provider_payment ON payments (provider, provider_payment_id)
    WHERE provider_payment_id IS NOT NULL;
CREATE INDEX idx_payments_user_id ON payments (user_id, created_at DESC);
CREATE INDEX idx_payments_plan_id ON payments (subscription_plan_id);
CREATE INDEX idx_payments_subscription_id ON payments (user_subscription_id) WHERE user_subscription_id IS NOT NULL;

COMMENT ON COLUMN payments.amount IS 'Major currency units (rupees), copied from the plan price';
