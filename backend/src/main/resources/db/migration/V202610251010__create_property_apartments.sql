-- Apartment configurations (unit types) of a project, e.g. "2 BHK Type A". The same apartment_type
-- may appear several times per project (different floor plans), so it is deliberately not unique.
-- Rollback: db/rollback/U202610251010__create_property_apartments.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE property_apartments (
    id                   BIGSERIAL PRIMARY KEY,
    -- CASCADE only on an explicit hard delete (purge) of the project; normal deletes are soft.
    property_project_id  BIGINT        NOT NULL REFERENCES property_projects (id) ON DELETE CASCADE,
    apartment_name       VARCHAR(100)  NOT NULL,
    apartment_type       VARCHAR(20)   NOT NULL,
    starting_price       NUMERIC(14, 2) NOT NULL,
    currency             VARCHAR(3)    NOT NULL DEFAULT 'INR',
    description          TEXT,
    bedrooms             SMALLINT      NOT NULL,
    bathrooms            SMALLINT      NOT NULL,
    balconies            SMALLINT      NOT NULL DEFAULT 0,
    car_parking          SMALLINT      NOT NULL DEFAULT 0,
    -- Any area may be unknown; all are in area_unit.
    area_min             NUMERIC(10, 2),
    area_max             NUMERIC(10, 2),
    carpet_area          NUMERIC(10, 2),
    balcony_area         NUMERIC(10, 2),
    built_up_area        NUMERIC(10, 2),
    super_built_up_area  NUMERIC(10, 2),
    area_unit            VARCHAR(10)   NOT NULL DEFAULT 'sq_ft',
    -- JSON array of short highlight strings.
    highlights           JSONB,
    display_order        INTEGER       NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,

    CONSTRAINT chk_property_apartments_apartment_type
        CHECK (apartment_type IN ('1bhk', '2bhk', '3bhk', '4bhk', 'penthouse')),
    CONSTRAINT chk_property_apartments_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_property_apartments_area_unit CHECK (area_unit IN ('sq_ft', 'sq_m')),
    CONSTRAINT chk_property_apartments_starting_price CHECK (starting_price >= 0),
    CONSTRAINT chk_property_apartments_rooms
        CHECK (bedrooms >= 0 AND bathrooms >= 0 AND balconies >= 0 AND car_parking >= 0),
    CONSTRAINT chk_property_apartments_area_range
        CHECK (area_min > 0 AND area_max >= area_min),
    CONSTRAINT chk_property_apartments_areas
        CHECK (area_max > 0 AND carpet_area >= 0 AND balcony_area >= 0
            AND built_up_area >= 0 AND super_built_up_area >= 0),
    CONSTRAINT chk_property_apartments_display_order CHECK (display_order >= 0),
    CONSTRAINT chk_property_apartments_highlights CHECK (jsonb_typeof(highlights) = 'array')
);

-- Full index: also serves the FK cascade on project purge.
CREATE INDEX idx_property_apartments_property_project_id ON property_apartments (property_project_id);
CREATE INDEX idx_property_apartments_apartment_type ON property_apartments (apartment_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_apartments_starting_price ON property_apartments (starting_price) WHERE deleted_at IS NULL;
