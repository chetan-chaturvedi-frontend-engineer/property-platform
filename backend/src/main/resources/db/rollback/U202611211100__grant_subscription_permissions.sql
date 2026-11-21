-- Rollback for db/migration/V202611211100__grant_subscription_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the subscription module from the user role, also where it was changed after the migration.
-- Taken subscriptions and the other modules are not touched.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'subscription',
    updated_at = now()
WHERE slug = 'user'
  AND permissions ? 'subscription';

DELETE FROM flyway_schema_history WHERE version = '202611211100';
