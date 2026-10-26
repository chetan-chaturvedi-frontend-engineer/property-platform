-- Initial roles with explicitly reviewed permissions. Idempotent: existing slugs (including
-- soft-deleted ones) are left exactly as they are, so customized roles are never overwritten.
-- Does not touch users: nobody is assigned super-admin (users.user_type allows only 'user' and
-- 'admin'), and existing user_type values keep pointing at the matching slug.
-- Rollback: db/rollback/U202610251210__seed_roles.sql
--
-- Granted codes are <MODULE>_<ACTION> in upper case, matching security/Permissions.

SET LOCAL lock_timeout = '5s';

INSERT INTO roles (name, slug, permissions) VALUES
    ('Super Admin', 'super-admin', '{
        "admin_panel": {"access": true},
        "subscription_plan": {"view": true, "create": true, "update": true},
        "role": {"view": true, "create": true, "update": true, "delete": true}
    }'),
    ('Admin', 'admin', '{
        "admin_panel": {"access": true},
        "subscription_plan": {"view": true, "create": true, "update": true},
        "role": {"view": true, "create": false, "update": false, "delete": false}
    }'),
    -- App users need no permissions today: app endpoints only require authentication.
    ('User', 'user', '{
        "admin_panel": {"access": false}
    }')
ON CONFLICT (slug) DO NOTHING;
