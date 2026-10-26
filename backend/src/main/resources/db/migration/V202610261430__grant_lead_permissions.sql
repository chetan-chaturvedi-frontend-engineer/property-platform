-- Lead CRM permissions (security/Permissions). Merged into the roles' existing permissions, so other
-- modules and lead keys already present are untouched; no other role (super-admin, custom roles) is
-- changed.
--   user:  lead_schedule.* and lead_interaction.* on the leads they can see (their own leads).
--   admin: lead.create, lead.assign, lead_schedule.*, lead_interaction.* (it already holds lead.*_any).
-- lead.access_assigned (leads assigned to the user count as their own) is granted to no role.
-- Rollback: db/rollback/U202610261430__grant_lead_permissions.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions
        || jsonb_build_object('lead_schedule', COALESCE(permissions -> 'lead_schedule', '{}'::jsonb)
            || '{"view": true, "create": true, "update": true, "delete": true}'::jsonb)
        || jsonb_build_object('lead_interaction', COALESCE(permissions -> 'lead_interaction', '{}'::jsonb)
            || '{"view": true, "create": true, "update": true, "delete": true}'::jsonb),
    updated_at = now()
WHERE slug IN ('user', 'admin');

UPDATE roles
SET permissions = permissions || jsonb_build_object('lead', COALESCE(permissions -> 'lead', '{}'::jsonb)
        || '{"create": true, "assign": true}'::jsonb),
    updated_at = now()
WHERE slug = 'admin';
