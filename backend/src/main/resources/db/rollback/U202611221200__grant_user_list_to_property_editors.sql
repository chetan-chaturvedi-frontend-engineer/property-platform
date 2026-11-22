-- Rollback for db/migration/V202611221200__grant_user_list_to_property_editors.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Removes user.list where it is still exactly what the migration added: roles other than admin and
-- super-admin whose user module holds nothing but {"list": true}. Roles given more user permissions since
-- keep them.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'user',
    updated_at = now()
WHERE slug NOT IN ('admin', 'super-admin')
  AND permissions -> 'user' = '{"list": true}'::jsonb;

DELETE FROM flyway_schema_history WHERE version = '202611221200';
