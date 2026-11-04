-- Rollback for db/migration/V202611041100__grant_system_log_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the system_log module from the admin and super-admin roles, also where it was changed after the
-- migration. System logs and the other modules are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'system_log',
    updated_at = now()
WHERE slug IN ('admin', 'super-admin')
  AND permissions ? 'system_log';

DELETE FROM flyway_schema_history WHERE version = '202611041100';
