-- Builder team permissions (security/Permissions). Merged into the roles' existing permissions, so other
-- modules and builder_team keys already present are untouched; no other role (super-admin, custom roles)
-- is changed.
--   user:  manage the caller's own team, and see and answer the caller's own invitations.
--   admin: the _any permissions of the admin dashboard. assign_role, manage_permissions and
--          manage_status are capabilities, not scopes: admin endpoints need them next to update_any.
-- Rollback: db/rollback/U202610271310__grant_builder_team_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions
        || jsonb_build_object('builder_team', COALESCE(permissions -> 'builder_team', '{}'::jsonb)
            || '{"list": true, "view": true, "create": true, "update": true, "delete": true,
                 "assign_role": true, "manage_permissions": true, "manage_status": true}'::jsonb)
        || jsonb_build_object('builder_team_membership', COALESCE(permissions -> 'builder_team_membership', '{}'::jsonb)
            || '{"view": true, "respond": true}'::jsonb),
    updated_at = now()
WHERE slug = 'user';

UPDATE roles
SET permissions = permissions || jsonb_build_object('builder_team', COALESCE(permissions -> 'builder_team', '{}'::jsonb)
        || '{"list_any": true, "view_any": true, "create_any": true, "update_any": true, "delete_any": true,
             "assign_role": true, "manage_permissions": true, "manage_status": true}'::jsonb),
    updated_at = now()
WHERE slug = 'admin';
