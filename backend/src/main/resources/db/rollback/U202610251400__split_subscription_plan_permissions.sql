-- Rollback for db/migration/V202610251400__split_subscription_plan_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes subscription_plan.list and subscription_plan.change_status from every role, also where
-- they were changed after the migration. Deploy code that checks view/update again afterwards.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions #- '{subscription_plan,list}' #- '{subscription_plan,change_status}',
    updated_at = now()
WHERE (permissions -> 'subscription_plan') ?| ARRAY['list', 'change_status'];

DELETE FROM flyway_schema_history WHERE version = '202610251400';
