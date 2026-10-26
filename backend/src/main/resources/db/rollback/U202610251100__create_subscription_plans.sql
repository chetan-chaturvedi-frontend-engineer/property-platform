-- Rollback for db/migration/V202610251100__create_subscription_plans.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Roll back newer subscription migrations first; without CASCADE this fails while dependents exist.
-- WARNING: all subscription plans are deleted. Its indexes and constraints are dropped with the table.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS subscription_plans;

DELETE FROM flyway_schema_history WHERE version = '202610251100';
