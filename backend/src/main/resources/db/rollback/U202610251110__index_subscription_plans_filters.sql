-- Rollback for db/migration/V202610251110__index_subscription_plans_filters.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Drops only the indexes; plan data is not touched.

SET LOCAL lock_timeout = '5s';

DROP INDEX IF EXISTS idx_subscription_plans_billing_interval;
DROP INDEX IF EXISTS idx_subscription_plans_popular;
DROP INDEX IF EXISTS idx_subscription_plans_price;
DROP INDEX IF EXISTS idx_subscription_plans_title;
DROP INDEX IF EXISTS idx_subscription_plans_created_at;
DROP INDEX IF EXISTS idx_subscription_plans_updated_at;

DELETE FROM flyway_schema_history WHERE version = '202610251110';
