-- Optional description of a role, shown and edited on the admin Roles & Permissions page.
-- Nullable without a default, so ADD COLUMN does not rewrite the table. The seeded roles get a
-- description only while they have none, so later edits are never overwritten.
-- Rollback: db/rollback/U202611211000__add_roles_description.sql

SET LOCAL lock_timeout = '5s';

ALTER TABLE roles ADD COLUMN description VARCHAR(500);

COMMENT ON COLUMN roles.description IS 'Optional purpose of the role, edited on the admin dashboard';

UPDATE roles
SET description = CASE slug
        WHEN 'super-admin' THEN 'Full access to every feature; managed by migrations only.'
        WHEN 'admin' THEN 'Manages the admin dashboard, content, users and listings.'
        WHEN 'user' THEN 'App users: access to their own properties, leads and site visits.'
    END
WHERE slug IN ('super-admin', 'admin', 'user')
  AND description IS NULL;
