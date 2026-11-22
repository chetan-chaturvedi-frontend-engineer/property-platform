-- Links a property to the builder's user account (admin dashboard: the Builder field of step 1).
-- builder_company_name stays: it is the display name (set from the builder's name when linked) for
-- properties created without a link, by the mobile app, and for search.
-- Nullable, no default: ADD COLUMN does not rewrite the table, and existing rows have no link.
-- Rollback: db/rollback/U202611221100__add_property_builder_user.sql

SET LOCAL lock_timeout = '5s';

-- RESTRICT: users are soft-deleted, so a linked account is never removed underneath a property.
ALTER TABLE property_projects
    ADD COLUMN builder_user_id BIGINT REFERENCES users (id) ON DELETE RESTRICT;

CREATE INDEX idx_property_projects_builder_user
    ON property_projects (builder_user_id) WHERE builder_user_id IS NOT NULL;

COMMENT ON COLUMN property_projects.builder_user_id IS
    'users.id of the builder (a user with the builder role); NULL when only builder_company_name is known';
