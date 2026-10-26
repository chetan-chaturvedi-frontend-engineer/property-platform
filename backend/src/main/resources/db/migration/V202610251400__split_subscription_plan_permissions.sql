-- Splits plan permissions so listing and status changes can be granted on their own:
-- subscription_plan.list (GET list) and subscription_plan.change_status (PATCH .../status).
-- Every role gets list = its current view grant and change_status = its current update grant, so
-- no role gains or loses access. Keys a role already has are kept; roles without a
-- subscription_plan module are not touched. Applies to every role, including super-admin and
-- soft-deleted ones.
-- Rollback: db/rollback/U202610251400__split_subscription_plan_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = jsonb_set(permissions, '{subscription_plan,list}',
        to_jsonb(COALESCE((permissions #>> '{subscription_plan,view}')::boolean, false))),
    updated_at = now()
WHERE jsonb_typeof(permissions -> 'subscription_plan') = 'object'
  AND NOT (permissions -> 'subscription_plan') ? 'list';

UPDATE roles
SET permissions = jsonb_set(permissions, '{subscription_plan,change_status}',
        to_jsonb(COALESCE((permissions #>> '{subscription_plan,update}')::boolean, false))),
    updated_at = now()
WHERE jsonb_typeof(permissions -> 'subscription_plan') = 'object'
  AND NOT (permissions -> 'subscription_plan') ? 'change_status';
