import { boundsKey, inBounds, regionForCoordinates, regionToBounds } from '../src/utils/mapRegion';
import { toSearchQuery, EMPTY_FILTERS } from '../src/services/mappers/propertySearchMapper';

describe('regionToBounds', () => {
  it('turns a region into min/max edges', () => {
    expect(regionToBounds({ latitude: 18.5, longitude: 73.8, latitudeDelta: 0.2, longitudeDelta: 0.4 })).toEqual({
      minLat: 18.4,
      maxLat: 18.6,
      minLng: 73.6,
      maxLng: 74,
    });
  });
  it('clamps a zoomed-out world view to valid degrees', () => {
    const b = regionToBounds({ latitude: 0, longitude: 0, latitudeDelta: 400, longitudeDelta: 500 });
    expect(b).toEqual({ minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 });
  });
});

describe('map helpers', () => {
  const bounds = { minLat: 18, maxLat: 19, minLng: 73, maxLng: 74 };
  it('detects points inside a box, edges included', () => {
    expect(inBounds({ latitude: 18.5, longitude: 73.5 }, bounds)).toBe(true);
    expect(inBounds({ latitude: 19, longitude: 74 }, bounds)).toBe(true);
    expect(inBounds({ latitude: 19.1, longitude: 73.5 }, bounds)).toBe(false);
  });
  it('builds a stable key', () => {
    expect(boundsKey(bounds)).toBe('18,19,73,74');
    expect(boundsKey(null)).toBe('');
  });
  it('frames points, with a minimum zoom for one point', () => {
    expect(regionForCoordinates([])).toBeUndefined();
    expect(regionForCoordinates([{ latitude: 18, longitude: 73 }])).toMatchObject({ latitudeDelta: 0.02, longitudeDelta: 0.02 });
    const r = regionForCoordinates([{ latitude: 18, longitude: 73 }, { latitude: 19, longitude: 75 }]);
    expect(r?.latitude).toBe(18.5);
    expect(r?.longitude).toBe(74);
  });
});

describe('toSearchQuery bounds', () => {
  it('adds the four edges only when a box is given', () => {
    expect(toSearchQuery(EMPTY_FILTERS, '', 50)).not.toContain('minLat');
    const q = toSearchQuery(EMPTY_FILTERS, '', 100, { minLat: 18, maxLat: 19, minLng: 73, maxLng: 74 });
    expect(q).toContain('minLat=18&maxLat=19&minLng=73&maxLng=74');
    expect(q).toContain('size=100');
  });
});
