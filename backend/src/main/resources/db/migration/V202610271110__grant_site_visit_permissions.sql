-- Site visit permissions (security/Permissions). Merged into the roles' existing permissions, so other
-- modules and site_visit keys already present are untouched; no other role (super-admin, custom roles)
-- is changed.
--   user:  the app permissions, always limited to visits the user is builder, assignee or visitor of.
--   admin: the _any permissions of the admin dashboard.
-- site_visit.access_assigned (visits assigned to the user count as their own) is granted to no role.
-- Rollback: db/rollback/U202610271110__grant_site_visit_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions || jsonb_build_object('site_visit', COALESCE(permissions -> 'site_visit', '{}'::jsonb)
        || '{"list": true, "view": true, "create": true, "update": true, "update_status": true,
             "submit_report": true, "assign": true}'::jsonb),
    updated_at = now()
WHERE slug = 'user';

UPDATE roles
SET permissions = permissions || jsonb_build_object('site_visit', COALESCE(permissions -> 'site_visit', '{}'::jsonb)
        || '{"list_any": true, "view_any": true, "create_any": true, "update_any": true, "delete_any": true,
             "assign_any": true, "update_status_any": true, "submit_report_any": true}'::jsonb),
    updated_at = now()
WHERE slug = 'admin';
