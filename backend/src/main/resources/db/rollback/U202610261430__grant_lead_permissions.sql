-- Rollback for db/migration/V202610261430__grant_lead_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the lead_schedule and lead_interaction modules from the user and admin roles and the
-- lead.create and lead.assign keys from the admin role, also where they were changed after the
-- migration. Lead data and the other lead keys are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'lead_schedule' - 'lead_interaction',
    updated_at = now()
WHERE slug IN ('user', 'admin')
  AND (permissions ? 'lead_schedule' OR permissions ? 'lead_interaction');

UPDATE roles
SET permissions = jsonb_set(permissions, '{lead}', (permissions -> 'lead') - 'create' - 'assign'),
    updated_at = now()
WHERE slug = 'admin'
  AND jsonb_typeof(permissions -> 'lead') = 'object'
  AND ((permissions -> 'lead') ? 'create' OR (permissions -> 'lead') ? 'assign');

DELETE FROM flyway_schema_history WHERE version = '202610261430';
