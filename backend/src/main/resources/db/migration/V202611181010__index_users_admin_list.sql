-- Indexes for the admin user list (GET /api/v1/admin/users): the status filter and counts, and the sortable
-- columns, all limited to non-deleted users like the queries. idx_users_type_status already covers filters
-- that include user_type; email sorts use the unique index on email.
-- Built without CONCURRENTLY (Flyway runs each migration in a transaction); users is small enough today that
-- the short write lock is acceptable. Rebuild CONCURRENTLY by hand if the table has grown large.
-- Rollback: db/rollback/U202611181010__index_users_admin_list.sql

SET LOCAL lock_timeout = '5s';

CREATE INDEX idx_users_status ON users (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users (created_at, id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_full_name ON users (full_name, id) WHERE deleted_at IS NULL;
