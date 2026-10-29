-- Rollback for db/migration/V202610271300__add_team_member_limits.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Drops the team member limits; plans, subscriptions and team memberships are kept.

SET LOCAL lock_timeout = '5s';

-- The check constraints are dropped with their columns.
ALTER TABLE user_subscriptions DROP COLUMN IF EXISTS no_of_team_members;
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS no_of_team_members;

DELETE FROM flyway_schema_history WHERE version = '202610271300';
