-- Places near a project, shared by all its apartment configurations.
-- Rollback: db/rollback/U202610251050__create_property_project_nearby_places.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE property_project_nearby_places (
    id                   BIGSERIAL PRIMARY KEY,
    property_project_id  BIGINT        NOT NULL REFERENCES property_projects (id) ON DELETE CASCADE,
    place_name           VARCHAR(150)  NOT NULL,
    place_type           VARCHAR(30)   NOT NULL,
    distance_km          NUMERIC(7, 2) NOT NULL,
    -- 'manual' = entered by the owner, unverified. Only a configured mapping service sets 'map_service'.
    distance_source      VARCHAR(20)   NOT NULL DEFAULT 'manual',
    latitude             NUMERIC(9, 6),
    longitude            NUMERIC(9, 6),
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_property_project_nearby_places_place_type
        CHECK (place_type IN ('school', 'hospital', 'shopping_mall', 'metro_station', 'railway_station',
                              'airport', 'bus_stop', 'other')),
    CONSTRAINT chk_property_project_nearby_places_distance_source
        CHECK (distance_source IN ('manual', 'map_service')),
    CONSTRAINT chk_property_project_nearby_places_distance_km CHECK (distance_km >= 0),
    CONSTRAINT chk_property_project_nearby_places_coordinates
        CHECK ((latitude IS NULL) = (longitude IS NULL)
            AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

-- Leading column also serves plain project lookups and the FK cascade.
CREATE INDEX idx_property_project_nearby_places_project_type
    ON property_project_nearby_places (property_project_id, place_type);
