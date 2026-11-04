-- System logs: append-only record of important activity, written through activitylog/service/SystemLogService.
-- The triggers stop application code (and anything else using SQL) from changing history. They are a guard, not a
-- security boundary: a table owner can disable them. A future retention job must disable them deliberately, or
-- run as a separate role, and deleted rows should be archived first.
-- Rollback: db/rollback/U202611041000__create_system_logs.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE system_logs (
    id               BIGSERIAL PRIMARY KEY,
    -- NULL = guest or system. Unverified registrations are hard-deleted (AuthCleanupJob), so the link must clear
    -- instead of blocking that delete; reference_id and additional_data keep what happened.
    user_id          BIGINT        REFERENCES users (id) ON DELETE SET NULL,
    module           VARCHAR(50)   NOT NULL,
    action           VARCHAR(255)  NOT NULL,
    log_level        VARCHAR(10)   NOT NULL,
    ip_address       INET,
    user_agent       VARCHAR(512),
    request_method   VARCHAR(10),
    -- Path only: query strings can carry secrets and are never stored.
    request_url      VARCHAR(2048),
    reference_id     BIGINT,
    reference_type   VARCHAR(50),
    additional_data  JSONB,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_system_logs_module_not_blank CHECK (btrim(module) <> ''),
    CONSTRAINT chk_system_logs_action_not_blank CHECK (btrim(action) <> ''),
    -- Adding a value later = drop and re-create the constraint; no column or data change.
    CONSTRAINT chk_system_logs_log_level CHECK (log_level IN ('info', 'success', 'warning')),
    CONSTRAINT chk_system_logs_request_method CHECK (request_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    -- An id means nothing without its type.
    CONSTRAINT chk_system_logs_reference CHECK (reference_id IS NULL OR reference_type IS NOT NULL),
    CONSTRAINT chk_system_logs_additional_data CHECK (additional_data IS NULL OR jsonb_typeof(additional_data) = 'object')
);

-- Dashboards filter by one of these and show the newest first, so created_at follows each filter column. The leading
-- column still serves plain filters, and the user_id index also serves the FK when a user is deleted. Partial indexes
-- skip the many guest, system and reference-less rows.
CREATE INDEX idx_system_logs_user_id ON system_logs (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_system_logs_module ON system_logs (module, created_at DESC);
CREATE INDEX idx_system_logs_log_level ON system_logs (log_level, created_at DESC);
CREATE INDEX idx_system_logs_reference ON system_logs (reference_id, reference_type, created_at DESC)
    WHERE reference_id IS NOT NULL;
CREATE INDEX idx_system_logs_created_at ON system_logs (created_at DESC);

CREATE FUNCTION reject_system_logs_change() RETURNS trigger
    LANGUAGE plpgsql AS
$$
BEGIN
    -- ON DELETE SET NULL is the one allowed update: it runs inside the FK's own trigger (depth > 1) and clears only
    -- user_id. A direct UPDATE runs at depth 1 and always fails.
    IF TG_OP = 'UPDATE' AND pg_trigger_depth() > 1 AND NEW.user_id IS NULL
            AND to_jsonb(NEW) - 'user_id' = to_jsonb(OLD) - 'user_id' THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'system_logs is append-only (% rejected)', TG_OP USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_system_logs_append_only
    BEFORE UPDATE OR DELETE ON system_logs
    FOR EACH ROW EXECUTE FUNCTION reject_system_logs_change();

-- Also catches TRUNCATE users CASCADE, which would otherwise empty this table.
CREATE TRIGGER trg_system_logs_no_truncate
    BEFORE TRUNCATE ON system_logs
    FOR EACH STATEMENT EXECUTE FUNCTION reject_system_logs_change();

COMMENT ON COLUMN system_logs.user_id IS 'Who acted; NULL for guests, system jobs and hard-deleted users';
COMMENT ON COLUMN system_logs.action IS 'Human-readable description of the activity';
COMMENT ON COLUMN system_logs.reference_id IS 'Affected record, of the type in reference_type; not a foreign key';
