-- Rollback for db/migration/V202610251300__update_user_admin_role_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Restores the permissions seeded by V202610251210 for the user and admin roles. Customizations
-- made before or after V202610251300 are not restored. Other roles and users are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles SET permissions = '{
        "admin_panel": {"access": true},
        "subscription_plan": {"view": true, "create": true, "update": true},
        "role": {"view": true, "create": false, "update": false, "delete": false}
    }', updated_at = now()
WHERE slug = 'admin';

UPDATE roles SET permissions = '{
        "admin_panel": {"access": false}
    }', updated_at = now()
WHERE slug = 'user';

DELETE FROM flyway_schema_history WHERE version = '202610251300';
