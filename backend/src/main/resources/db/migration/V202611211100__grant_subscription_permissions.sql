-- Subscription permissions (security/Permissions): view and take a plan for oneself. Granted to the app user
-- role only: staff manage plans through the admin plan permissions and do not subscribe. Merged into the
-- role's existing permissions, so other modules and subscription keys already present are untouched; no
-- other role (admin, super-admin, custom roles) is changed.
-- Rollback: db/rollback/U202611211100__grant_subscription_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions
        || jsonb_build_object('subscription', COALESCE(permissions -> 'subscription', '{}'::jsonb)
            || '{"view": true, "create": true}'::jsonb),
    updated_at = now()
WHERE slug = 'user';
