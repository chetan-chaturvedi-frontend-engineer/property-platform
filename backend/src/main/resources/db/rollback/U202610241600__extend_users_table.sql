-- Rollback for db/migration/V202610241600__extend_users_table.sql.
-- Flyway Community has no undo migrations, so run this manually (see CLAUDE.md, "Rolling back"):
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- It also removes the Flyway history row so the migration can be re-applied on next startup.
-- WARNING: data in the dropped columns is lost; back it up first in production.

SET LOCAL lock_timeout = '5s';

DROP INDEX IF EXISTS idx_users_type_status;
DROP INDEX IF EXISTS idx_users_phone;

-- Dropping a column also drops its CHECK constraint.
ALTER TABLE users
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS notification_status,
    DROP COLUMN IF EXISTS notification_token,
    DROP COLUMN IF EXISTS moa_aoa,
    DROP COLUMN IF EXISTS company_registration,
    DROP COLUMN IF EXISTS driving_license,
    DROP COLUMN IF EXISTS business_address_proof,
    DROP COLUMN IF EXISTS gst_certificate,
    DROP COLUMN IF EXISTS rera_certificate,
    DROP COLUMN IF EXISTS pan_card,
    DROP COLUMN IF EXISTS aadhar_card,
    DROP COLUMN IF EXISTS phone_verified,
    DROP COLUMN IF EXISTS email_verified,
    DROP COLUMN IF EXISTS user_type,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS phone;

DELETE FROM flyway_schema_history WHERE version = '202610241600';
