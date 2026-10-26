-- Indexes for the admin blog list filters and sorts added with the blog API (see V202610251810 for
-- the public-feed, category, status and slug indexes, which already cover the public endpoints).
-- Title/slug search uses ILIKE '%term%', which a btree index cannot serve; the table stays small.
-- Tag filtering is not indexed: jsonb_exists() cannot use a GIN index, and tags filter only within
-- the already-narrow public feed or the admin list.
-- Rollback: db/rollback/U202610252010__index_blogs_admin_filters.sql

SET LOCAL lock_timeout = '5s';

-- created_from / created_to and sort=createdAt across all statuses (idx_blogs_status_created_at only
-- helps when status is filtered too).
CREATE INDEX idx_blogs_created_at ON blogs (created_at) WHERE deleted_at IS NULL;
-- published_from / published_to and sort=publishedAt, drafts included (the public index has
-- published rows only).
CREATE INDEX idx_blogs_published_at ON blogs (published_at) WHERE deleted_at IS NULL;
