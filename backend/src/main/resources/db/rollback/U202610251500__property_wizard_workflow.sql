-- Rollback for db/migration/V202610251500__property_wizard_workflow.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: the status-change history and the property permissions are deleted.
-- Fails (and changes nothing) while projects use the new statuses or lack location data: the
-- restored constraints cannot hold. Resolve those rows first.

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions - 'property',
    updated_at = now()
WHERE slug IN ('user', 'admin', 'super-admin');

DROP TABLE IF EXISTS property_project_status_changes;

DROP INDEX IF EXISTS idx_property_projects_published_at;
DROP INDEX IF EXISTS uq_property_projects_idempotency_key;

ALTER TABLE property_projects
    DROP CONSTRAINT IF EXISTS chk_property_projects_wizard_step,
    DROP CONSTRAINT chk_property_projects_publication_status,
    ADD CONSTRAINT chk_property_projects_publication_status
        CHECK (publication_status IN ('draft', 'pending_review', 'published', 'rejected'));

ALTER TABLE property_projects
    DROP COLUMN IF EXISTS published_at,
    DROP COLUMN IF EXISTS idempotency_key,
    DROP COLUMN IF EXISTS wizard_step,
    DROP COLUMN IF EXISTS version,
    ALTER COLUMN project_address SET NOT NULL,
    ALTER COLUMN city SET NOT NULL,
    ALTER COLUMN locality SET NOT NULL,
    ALTER COLUMN pincode SET NOT NULL,
    ALTER COLUMN state SET NOT NULL;

DELETE FROM flyway_schema_history WHERE version = '202610251500';
