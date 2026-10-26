-- Rollback for db/migration/V202610251210__seed_roles.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: hard-deletes the three seeded roles, including any customizations made since. Other
-- roles and users are not touched. Re-applying the seed restores the default permissions.

SET LOCAL lock_timeout = '5s';

DELETE FROM roles WHERE slug IN ('super-admin', 'admin', 'user');

DELETE FROM flyway_schema_history WHERE version = '202610251210';
