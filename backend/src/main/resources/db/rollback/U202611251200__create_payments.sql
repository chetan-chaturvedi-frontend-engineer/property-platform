-- Rollback for db/migration/V202611251200__create_payments.sql.
--   psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app -f <this file>
-- Drops the payments table and its payment history. Subscriptions are not touched.

SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS payments;

DELETE FROM flyway_schema_history WHERE version = '202611251200';
