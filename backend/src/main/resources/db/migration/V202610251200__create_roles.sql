-- Roles with module-wise JSON permissions. A user's role is the row whose slug equals
-- users.user_type; there is deliberately no foreign key or join table (see role/domain/Role).
-- Rollback: db/rollback/U202610251200__create_roles.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    -- Same length as users.user_type, which stores it. Never changed after creation.
    slug        VARCHAR(30)  NOT NULL,
    -- {"<module>": {"<action>": true|false}}; anything missing or not true is denied.
    permissions JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status      VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,

    -- Covers soft-deleted rows too: a deleted slug is never reused, so users still pointing at it
    -- cannot silently inherit a new role's permissions. Also provides the slug lookup index.
    CONSTRAINT uq_roles_slug UNIQUE (slug),
    CONSTRAINT chk_roles_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_roles_status CHECK (status IN ('active', 'inactive')),
    -- Shape only, not the list of modules/actions: an object of objects of booleans with
    -- snake_case keys. Strict mode so arrays are not unwrapped (e.g. [true] is rejected).
    CONSTRAINT chk_roles_permissions
        CHECK (jsonb_typeof(permissions) = 'object'
            AND NOT jsonb_path_exists(permissions, 'strict $.* ? (@.type() != "object")')
            AND NOT jsonb_path_exists(permissions, 'strict $.*.* ? (@.type() != "boolean")')
            AND NOT jsonb_path_exists(permissions,
                'strict $.keyvalue() ? (!(@.key like_regex "^[a-z][a-z0-9_]{0,49}$"))')
            AND NOT jsonb_path_exists(permissions,
                'strict $.*.keyvalue() ? (!(@.key like_regex "^[a-z][a-z0-9_]{0,49}$"))'))
);

-- No further indexes: roles are resolved by slug (uq_roles_slug) and the table stays small.

COMMENT ON COLUMN roles.slug IS 'Referenced by users.user_type; immutable and never reused';
COMMENT ON COLUMN roles.permissions IS 'Module-wise grants {"module": {"action": true}}; missing or false = denied';
COMMENT ON COLUMN roles.status IS 'inactive roles grant nothing; the super-admin role cannot be deactivated';
