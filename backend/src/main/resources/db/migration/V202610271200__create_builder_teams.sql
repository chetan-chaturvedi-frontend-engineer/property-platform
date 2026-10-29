-- Builder teams: one row per membership of an employee in a builder's team. Builders and employees are
-- both users (there is no builders or employees table; builders own property_projects.user_id).
-- Memberships are soft-deleted and every FK is RESTRICT, so team history is never lost silently.
-- Rollback: db/rollback/U202610271200__create_builder_teams.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE builder_teams (
    id           BIGSERIAL PRIMARY KEY,
    -- Account that created the membership (invited the employee): the builder, a team manager acting
    -- for the builder, or an admin. Kept as history; never changes.
    user_id      BIGINT       NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    -- Builder who owns the team.
    builder_id   BIGINT       NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    -- The team member's own account.
    employee_id  BIGINT       NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    -- Slug of a role (roles.slug), like users.user_type and with the same format rule; no foreign key,
    -- matching users.user_type. The application accepts only active roles a builder may assign.
    role         VARCHAR(30)  NOT NULL,
    -- Builder-scoped grants, same shape as roles.permissions: {"<module>": {"<action>": true|false}};
    -- anything missing or not true is denied. They apply only to the builder's own data, and the
    -- application only stores permissions the grantor holds.
    permissions  JSONB        NOT NULL DEFAULT '{}'::jsonb,
    -- pending = invited, not answered; active = member; inactive = temporarily disabled;
    -- rejected = invitation declined; revoked = removed by the builder or an admin.
    status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
    -- When the employee accepted; set from the first activation and kept afterwards.
    joined_at    TIMESTAMPTZ,
    -- Internal note by the builder or admin; never shown to the employee.
    notes        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ,

    -- A builder has full access to their own data; joining their own team would be meaningless.
    CONSTRAINT chk_builder_teams_not_self CHECK (employee_id <> builder_id),
    CONSTRAINT chk_builder_teams_role_format CHECK (role ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_builder_teams_status
        CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'revoked')),
    -- Members (active or inactive) have joined; open or declined invitations have not.
    CONSTRAINT chk_builder_teams_joined_at
        CHECK ((status NOT IN ('active', 'inactive') OR joined_at IS NOT NULL)
            AND (status NOT IN ('pending', 'rejected') OR joined_at IS NULL)),
    -- Same rule as chk_roles_permissions.
    CONSTRAINT chk_builder_teams_permissions
        CHECK (jsonb_typeof(permissions) = 'object'
            AND NOT jsonb_path_exists(permissions, 'strict $.* ? (@.type() != "object")')
            AND NOT jsonb_path_exists(permissions, 'strict $.*.* ? (@.type() != "boolean")')
            AND NOT jsonb_path_exists(permissions,
                'strict $.keyvalue() ? (!(@.key like_regex "^[a-z][a-z0-9_]{0,49}$"))')
            AND NOT jsonb_path_exists(permissions,
                'strict $.*.keyvalue() ? (!(@.key like_regex "^[a-z][a-z0-9_]{0,49}$"))'))
);

-- At most one open invitation or membership per builder and employee. Rejected, revoked and
-- soft-deleted rows stay as history and do not block a new invitation.
CREATE UNIQUE INDEX uq_builder_teams_open_membership ON builder_teams (builder_id, employee_id)
    WHERE deleted_at IS NULL AND status IN ('pending', 'active', 'inactive');
-- Full indexes so they also serve the FK checks when a user row is deleted.
-- A builder's team, filtered by status.
CREATE INDEX idx_builder_teams_builder_id_status ON builder_teams (builder_id, status);
-- The teams and invitations of an employee; also the permission lookup per request.
CREATE INDEX idx_builder_teams_employee_id_status ON builder_teams (employee_id, status);
CREATE INDEX idx_builder_teams_user_id ON builder_teams (user_id);
-- Admin lists across builders: newest first, optionally filtered by status.
CREATE INDEX idx_builder_teams_status_created_at ON builder_teams (status, created_at) WHERE deleted_at IS NULL;

COMMENT ON COLUMN builder_teams.user_id IS 'Account that created (invited) the membership';
COMMENT ON COLUMN builder_teams.role IS 'roles.slug of the member''s team role; checked by the application, no FK';
COMMENT ON COLUMN builder_teams.permissions IS 'Builder-scoped grants {"module": {"action": true}}; missing or false = denied';
COMMENT ON COLUMN builder_teams.joined_at IS 'When the invitation was accepted; NULL while pending or after rejection';
