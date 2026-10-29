-- Builder team limit per plan, copied to each subscription like no_of_properties, so later plan edits
-- never change an existing subscription. Counts the builder's pending and active team members.
-- 0 = team management is not included; existing plans and subscriptions start at 0 until an admin
-- sets a limit. There is deliberately no "unlimited" value.
-- Rollback: db/rollback/U202610271300__add_team_member_limits.sql
--
-- Safe on populated tables: the columns have a constant default, so ADD COLUMN does not rewrite them.

SET LOCAL lock_timeout = '5s';

ALTER TABLE subscription_plans
    ADD COLUMN no_of_team_members INTEGER NOT NULL DEFAULT 0,
    ADD CONSTRAINT chk_subscription_plans_no_of_team_members CHECK (no_of_team_members >= 0);

ALTER TABLE user_subscriptions
    ADD COLUMN no_of_team_members INTEGER NOT NULL DEFAULT 0,
    ADD CONSTRAINT chk_user_subscriptions_no_of_team_members CHECK (no_of_team_members >= 0);

COMMENT ON COLUMN subscription_plans.no_of_team_members IS 'Maximum pending + active builder team members; 0 = not included';
COMMENT ON COLUMN user_subscriptions.no_of_team_members IS 'Team member limit copied from the plan; 0 = not included';
