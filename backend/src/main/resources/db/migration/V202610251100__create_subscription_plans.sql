-- Subscription plans catalog, managed by administrators only. Plans are referenced by user
-- subscriptions, so retire them with status = 'inactive' instead of deleting them (no soft delete).
-- Rollback: db/rollback/U202610251100__create_subscription_plans.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE subscription_plans (
    id                      BIGSERIAL PRIMARY KEY,
    -- UI icon identifier, not a URL.
    icon                    VARCHAR(100),
    -- Object storage key (same rules as media file_path) or an https URL.
    photo                   TEXT,
    title                   VARCHAR(100)   NOT NULL,
    -- Stable after creation: clients and code refer to plans by slug.
    slug                    VARCHAR(120)   NOT NULL,
    price                   NUMERIC(14, 2) NOT NULL,
    currency                VARCHAR(3)     NOT NULL DEFAULT 'INR',
    -- Charged every billing_interval_count billing_intervals, e.g. 3 x month = quarterly.
    billing_interval        VARCHAR(20)    NOT NULL DEFAULT 'month',
    billing_interval_count  INTEGER        NOT NULL DEFAULT 1,
    description             TEXT,
    -- Maximum active property listings; NULL = unlimited.
    no_of_properties        INTEGER,
    -- JSON array of display strings, e.g. ["Verified badge", "Priority support"]. Not used for
    -- feature gating; entitlements and limits are separate columns/tables.
    features                JSONB          NOT NULL DEFAULT '[]'::jsonb,
    -- Only 'active' plans are offered to users.
    status                  VARCHAR(20)    NOT NULL DEFAULT 'draft',
    is_popular              BOOLEAN        NOT NULL DEFAULT FALSE,
    sort_order              INTEGER        NOT NULL DEFAULT 0,
    trial_days              INTEGER        NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT uq_subscription_plans_slug UNIQUE (slug),
    CONSTRAINT chk_subscription_plans_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    -- Relative object key (no leading slash, no "..", no scheme) or an https URL.
    CONSTRAINT chk_subscription_plans_photo
        CHECK (photo ~ '^https://'
            OR (photo ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$' AND photo NOT LIKE '%..%')),
    CONSTRAINT chk_subscription_plans_price CHECK (price >= 0),
    CONSTRAINT chk_subscription_plans_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_subscription_plans_billing_interval
        CHECK (billing_interval IN ('month', 'year', 'lifetime')),
    -- A lifetime plan is charged once.
    CONSTRAINT chk_subscription_plans_billing_interval_count
        CHECK (billing_interval_count > 0 AND (billing_interval <> 'lifetime' OR billing_interval_count = 1)),
    CONSTRAINT chk_subscription_plans_no_of_properties CHECK (no_of_properties >= 0),
    CONSTRAINT chk_subscription_plans_features
        CHECK (jsonb_typeof(features) = 'array'
            AND NOT jsonb_path_exists(features, '$[*] ? (@.type() != "string")')),
    CONSTRAINT chk_subscription_plans_status CHECK (status IN ('draft', 'active', 'inactive')),
    CONSTRAINT chk_subscription_plans_sort_order CHECK (sort_order >= 0),
    CONSTRAINT chk_subscription_plans_trial_days CHECK (trial_days >= 0)
);

-- Pricing page: WHERE status = 'active' ORDER BY sort_order.
CREATE INDEX idx_subscription_plans_status_sort_order ON subscription_plans (status, sort_order);
-- Admin list across all statuses, ordered for display.
CREATE INDEX idx_subscription_plans_sort_order ON subscription_plans (sort_order);

COMMENT ON COLUMN subscription_plans.slug IS 'Stable plan key for URLs and code; never reused';
COMMENT ON COLUMN subscription_plans.billing_interval IS 'Billing unit; combined with billing_interval_count (lifetime = one-time charge)';
COMMENT ON COLUMN subscription_plans.no_of_properties IS 'Maximum active property listings; NULL means unlimited';
COMMENT ON COLUMN subscription_plans.features IS 'Display-only JSON array of feature strings; not used for feature gating';
COMMENT ON COLUMN subscription_plans.status IS 'draft = being prepared, active = offered to users, inactive = retired';
