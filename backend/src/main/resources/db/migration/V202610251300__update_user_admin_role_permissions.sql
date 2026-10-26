-- Sets the user and admin roles to the reviewed permissions below, creating them if missing.
-- Their permissions are replaced, not merged; name, status and deletion are reset to the defaults
-- (a soft-deleted role is restored, since its slug cannot be reused). Re-running changes nothing.
-- No other role and no user is touched.
-- Rollback: db/rollback/U202610251300__update_user_admin_role_permissions.sql
--
-- Only permissions with a meaning in the code today, plus leads (owner-scoped for app users, _any
-- for admins), whose module is not built yet. Codes are <MODULE>_<ACTION> in upper case
-- (security/Permissions); missing keys are denied.

SET LOCAL lock_timeout = '5s';

INSERT INTO roles (name, slug, permissions, status) VALUES
    -- Own leads only: the lead service must scope every query to the current user.
    ('User', 'user', '{
        "lead": {"list": true, "view": true, "create": true, "update": true, "delete": true}
    }', 'active'),
    -- subscription_plan.update also covers status changes; plans cannot be deleted.
    ('Admin', 'admin', '{
        "admin_panel": {"access": true},
        "subscription_plan": {"view": true, "create": true, "update": true},
        "role": {"view": true, "create": true, "update": true, "delete": true},
        "lead": {"list_any": true, "view_any": true, "update_any": true, "delete_any": true}
    }', 'active')
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        permissions = EXCLUDED.permissions,
        status = EXCLUDED.status,
        deleted_at = NULL,
        updated_at = now()
    -- Keeps updated_at when the role already matches.
    WHERE (roles.name, roles.permissions, roles.status, roles.deleted_at)
        IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.permissions, EXCLUDED.status, NULL);
