-- Rollback for db/migration/V202610261100__grant_faq_permissions.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes the faq module from the admin role, also where it was changed after the migration.
-- Admin FAQ endpoints then deny every user; FAQs and the public endpoints are not affected.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'faq',
    updated_at = now()
WHERE slug = 'admin'
  AND permissions ? 'faq';

DELETE FROM flyway_schema_history WHERE version = '202610261100';
