-- Rollback for db/migration/V202610271310__grant_builder_team_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the builder_team and builder_team_membership modules from the user and admin roles, also where
-- they were changed after the migration. Team memberships and the other modules are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'builder_team' - 'builder_team_membership',
    updated_at = now()
WHERE slug IN ('user', 'admin')
  AND (permissions ? 'builder_team' OR permissions ? 'builder_team_membership');

DELETE FROM flyway_schema_history WHERE version = '202610271310';
