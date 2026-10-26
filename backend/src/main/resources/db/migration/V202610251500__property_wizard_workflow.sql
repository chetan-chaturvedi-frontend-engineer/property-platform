-- Property creation wizard and publication workflow:
--   * location columns become nullable, so a draft can be saved after step 1 (submission requires them);
--   * version (optimistic locking), wizard_step (server-computed resume step), idempotency_key
--     (safe creation retries) and published_at;
--   * publication statuses approved, suspended and archived;
--   * property_project_status_changes: who changed a property's status, when and why;
--   * property permissions for the user, admin and super-admin roles.
-- Rollback: db/rollback/U202610251500__property_wizard_workflow.sql
--
-- Safe on populated tables: DROP NOT NULL and constant-default columns are metadata-only changes.

SET LOCAL lock_timeout = '5s';

ALTER TABLE property_projects
    ALTER COLUMN project_address DROP NOT NULL,
    ALTER COLUMN city DROP NOT NULL,
    ALTER COLUMN locality DROP NOT NULL,
    ALTER COLUMN pincode DROP NOT NULL,
    ALTER COLUMN state DROP NOT NULL,
    ADD COLUMN version          BIGINT       NOT NULL DEFAULT 0,
    ADD COLUMN wizard_step      SMALLINT     NOT NULL DEFAULT 1,
    -- Client-chosen key of the creation request (Idempotency-Key header), unique per owner.
    ADD COLUMN idempotency_key  VARCHAR(100),
    ADD COLUMN published_at     TIMESTAMPTZ;

ALTER TABLE property_projects
    DROP CONSTRAINT chk_property_projects_publication_status,
    ADD CONSTRAINT chk_property_projects_publication_status
        CHECK (publication_status IN ('draft', 'pending_review', 'approved', 'published', 'rejected',
                                      'suspended', 'archived')),
    ADD CONSTRAINT chk_property_projects_wizard_step CHECK (wizard_step BETWEEN 1 AND 7);

-- Also covers soft-deleted projects: a retried request never creates a second project.
CREATE UNIQUE INDEX uq_property_projects_idempotency_key ON property_projects (user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
-- Public listing: published projects, newest first.
CREATE INDEX idx_property_projects_published_at ON property_projects (published_at)
    WHERE deleted_at IS NULL AND publication_status = 'published';

COMMENT ON COLUMN property_projects.version IS 'Optimistic lock; incremented on every change to the project or its children';
COMMENT ON COLUMN property_projects.wizard_step IS 'First incomplete wizard step, computed by the server from saved data (7 = ready to submit)';

CREATE TABLE property_project_status_changes (
    id                   BIGSERIAL PRIMARY KEY,
    property_project_id  BIGINT        NOT NULL REFERENCES property_projects (id) ON DELETE CASCADE,
    -- RESTRICT: audit rows must survive; users are soft-deleted.
    actor_user_id        BIGINT        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    action               VARCHAR(30)   NOT NULL,
    -- Publication status, or legal approval status for legal_status_changed.
    from_status          VARCHAR(30),
    to_status            VARCHAR(30),
    reason               VARCHAR(1000),
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_property_project_status_changes_action
        CHECK (action IN ('created', 'submitted', 'approved', 'rejected', 'published', 'unpublished',
                          'suspended', 'resumed', 'archived', 'reverted_to_draft', 'deleted', 'restored',
                          'legal_status_changed'))
);

CREATE INDEX idx_property_project_status_changes_project
    ON property_project_status_changes (property_project_id, created_at);
CREATE INDEX idx_property_project_status_changes_actor ON property_project_status_changes (actor_user_id);

-- Merges the property module into existing role permissions; other modules are untouched.
-- App users manage only their own properties (the service scopes every query to the owner).
UPDATE roles
SET permissions = permissions || jsonb_build_object('property',
        COALESCE(permissions -> 'property', '{}'::jsonb)
        || '{"create": true, "list": true, "view": true, "update": true, "delete": true}'::jsonb),
    updated_at = now()
WHERE slug = 'user';

-- Admins: every property (_any), creation without a subscription, review and publication.
UPDATE roles
SET permissions = permissions || jsonb_build_object('property',
        COALESCE(permissions -> 'property', '{}'::jsonb)
        || '{"create": true, "create_without_subscription": true, "list_any": true, "view_any": true,
             "update_any": true, "delete_any": true, "restore_any": true, "review": true, "publish": true,
             "suspend": true, "legal_review": true}'::jsonb),
    updated_at = now()
WHERE slug IN ('admin', 'super-admin');
