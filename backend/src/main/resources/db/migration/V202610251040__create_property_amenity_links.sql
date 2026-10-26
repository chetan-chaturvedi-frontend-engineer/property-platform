-- Amenity links for projects and for apartment configurations (kept separate on purpose).
-- Links are removed with their project/apartment on purge; an amenity in use cannot be deleted.
-- Rollback: db/rollback/U202610251040__create_property_amenity_links.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE property_project_amenities (
    property_project_id  BIGINT       NOT NULL REFERENCES property_projects (id) ON DELETE CASCADE,
    property_amenity_id  BIGINT       NOT NULL REFERENCES property_amenities (id) ON DELETE RESTRICT,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (property_project_id, property_amenity_id)
);

-- Reverse lookup ("projects with a pool") and the FK check on amenity delete.
CREATE INDEX idx_property_project_amenities_amenity_id ON property_project_amenities (property_amenity_id);

CREATE TABLE property_apartment_amenities (
    property_apartment_id  BIGINT       NOT NULL REFERENCES property_apartments (id) ON DELETE CASCADE,
    property_amenity_id    BIGINT       NOT NULL REFERENCES property_amenities (id) ON DELETE RESTRICT,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (property_apartment_id, property_amenity_id)
);

CREATE INDEX idx_property_apartment_amenities_amenity_id ON property_apartment_amenities (property_amenity_id);
