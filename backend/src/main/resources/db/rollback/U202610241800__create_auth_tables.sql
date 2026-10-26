-- Rollback for db/migration/V202610241800__create_auth_tables.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- WARNING: all OTP challenges, sessions and refresh tokens are deleted (every user is logged out).

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS otp_challenges;

DROP INDEX IF EXISTS uq_users_phone;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone) WHERE phone IS NOT NULL;

DELETE FROM flyway_schema_history WHERE version = '202610241800';
