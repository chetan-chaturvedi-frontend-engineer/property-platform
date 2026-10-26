-- Amenities master catalog, managed by administrators only. Deactivate (is_active = false)
-- instead of deleting amenities that are in use.
-- Rollback: db/rollback/U202610251030__create_property_amenities.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE property_amenities (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(100)  NOT NULL,
    slug         VARCHAR(120)  NOT NULL,
    category     VARCHAR(50),
    description  TEXT,
    -- UI icon identifier, not a URL.
    icon         VARCHAR(100),
    is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_property_amenities_slug UNIQUE (slug),
    CONSTRAINT chk_property_amenities_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

INSERT INTO property_amenities (name, slug, category, icon) VALUES
    ('Swimming pool',          'swimming-pool',          'recreation',     'pool'),
    ('Gymnasium',              'gymnasium',              'recreation',     'gym'),
    ('Clubhouse',              'clubhouse',              'recreation',     'clubhouse'),
    ('Children''s play area',  'childrens-play-area',    'recreation',     'playground'),
    ('Garden',                 'garden',                 'outdoor',        'garden'),
    ('Jogging track',          'jogging-track',          'outdoor',        'jogging'),
    ('CCTV',                   'cctv',                   'security',       'cctv'),
    ('Security',               'security',               'security',       'shield'),
    ('Power backup',           'power-backup',           'utilities',      'power'),
    ('Lift',                   'lift',                   'utilities',      'elevator'),
    ('Rainwater harvesting',   'rainwater-harvesting',   'sustainability', 'water'),
    ('Covered parking',        'covered-parking',        'parking',        'parking');
