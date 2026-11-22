-- Indexes for the admin property dashboard: the recent activity feed (GET /api/v1/admin/properties/activity,
-- newest status changes first) and the "submitted in the last 7 days" count in GET /admin/properties/stats.
-- The per-property lookups (submittedAt in the admin list) use idx_property_project_status_changes_project.
-- Built without CONCURRENTLY (Flyway runs each migration in a transaction); the table is append-only and
-- small today, so the short write lock is acceptable. Rebuild CONCURRENTLY by hand if it has grown large.
-- Rollback: db/rollback/U202611221030__index_property_status_changes_activity.sql

SET LOCAL lock_timeout = '5s';

CREATE INDEX idx_property_project_status_changes_created_at
    ON property_project_status_changes (created_at DESC, id DESC);
CREATE INDEX idx_property_project_status_changes_action_created_at
    ON property_project_status_changes (action, created_at);
