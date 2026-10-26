-- Indexes for the admin plan list filters and sort fields (status and sort_order are indexed by
-- V202610251100). Title/slug search uses ILIKE '%term%', which a btree index cannot serve; the plan
-- catalog is small enough for a sequential scan.
-- Rollback: db/rollback/U202610251110__index_subscription_plans_filters.sql

SET LOCAL lock_timeout = '5s';

CREATE INDEX idx_subscription_plans_billing_interval ON subscription_plans (billing_interval);
-- Few plans are marked popular; only those are indexed.
CREATE INDEX idx_subscription_plans_popular ON subscription_plans (sort_order) WHERE is_popular;
CREATE INDEX idx_subscription_plans_price ON subscription_plans (price);
CREATE INDEX idx_subscription_plans_title ON subscription_plans (title);
CREATE INDEX idx_subscription_plans_created_at ON subscription_plans (created_at);
CREATE INDEX idx_subscription_plans_updated_at ON subscription_plans (updated_at);
