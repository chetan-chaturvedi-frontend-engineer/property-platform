-- Bounding-box search on the public map (GET /api/v1/public/properties?minLat&maxLat&minLng&maxLng).
-- Partial index: only live, published properties that have coordinates, so it stays small and the
-- planner can range-scan latitude and filter longitude from the index.
-- Built without CONCURRENTLY (Flyway runs each migration in a transaction); the table is small.
-- Rollback: db/rollback/U202611251400__index_property_projects_coordinates.sql

SET LOCAL lock_timeout = '5s';

CREATE INDEX idx_property_projects_public_coordinates
    ON property_projects (latitude, longitude)
    WHERE deleted_at IS NULL AND publication_status = 'published' AND latitude IS NOT NULL;
