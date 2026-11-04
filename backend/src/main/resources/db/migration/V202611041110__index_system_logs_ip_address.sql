-- The admin list filters by IP address, newest first, like the other filter columns of system_logs.
-- Rollback: db/rollback/U202611041110__index_system_logs_ip_address.sql

SET LOCAL lock_timeout = '5s';

CREATE INDEX idx_system_logs_ip_address ON system_logs (ip_address, created_at DESC) WHERE ip_address IS NOT NULL;
