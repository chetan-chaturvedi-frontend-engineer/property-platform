import { absoluteUrl, areaLabel, configLabel, toCoordinate, toProperty, toPropertyFromSummary } from '../src/services/mappers/propertyMapper';
import { formatCompactPrice } from '../src/utils/format';
import { ApiPublicProperty, ApiPublicPropertySummary } from '../src/types/api';

const summary: ApiPublicPropertySummary = {
  id: 4,
  slug: 'skyline-heights',
  projectName: 'Skyline Heights',
  builderCompanyName: 'Skyline Builders',
  propertyType: 'apartment',
  city: 'Hyderabad',
  locality: 'Kondapur',
  state: 'Telangana',
  projectStatus: 'ready_to_move',
  startingPrice: 12500000,
  apartmentTypes: ['2bhk', '3bhk', '4bhk'],
  coverUrl: '/api/v1/public/properties/skyline-heights/media/1/content',
  publishedAt: '2026-11-14T14:15:07Z',
  latitude: 17.4616,
  longitude: 78.3645,
};

describe('configLabel', () => {
  it('joins bedroom counts', () => {
    expect(configLabel(['2bhk', '3bhk', '4bhk'])).toBe('2, 3 & 4 BHK Apartments');
    expect(configLabel(['3bhk'])).toBe('3 BHK Apartments');
    expect(configLabel(['2bhk', '3bhk'])).toBe('2 & 3 BHK Apartments');
  });
  it('names a penthouse and handles none', () => {
    expect(configLabel(['3bhk', 'penthouse'])).toBe('3 BHK Apartments + Penthouse');
    expect(configLabel([])).toBe('');
  });
});

describe('areaLabel', () => {
  it('formats a range, a single value and missing areas', () => {
    expect(areaLabel([{ areaMin: 1200, areaMax: 2400, areaUnit: 'sq_ft' }])).toBe('1,200 - 2,400 sq.ft.');
    expect(areaLabel([{ areaMin: 1600, areaMax: 1600, areaUnit: 'sq_ft' }])).toBe('1,600 sq.ft.');
    expect(areaLabel([{ areaMin: null, areaMax: null, areaUnit: 'sq_ft' }])).toBe('');
  });
});

describe('toPropertyFromSummary', () => {
  it('maps a list item', () => {
    const p = toPropertyFromSummary(summary);
    expect(p).toMatchObject({
      id: 'skyline-heights',
      propertyId: 4,
      name: 'Skyline Heights',
      area: 'Kondapur, Hyderabad',
      config: '2, 3 & 4 BHK Apartments',
      price: '₹1.25 Cr*',
      status: 'Ready to Move',
    });
    expect(p.coverUrl).toMatch(/^https?:\/\/.+\/api\/v1\/public\/properties\/skyline-heights\/media\/1\/content$/);
  });
  it('shows a placeholder price when none is set', () => {
    expect(toPropertyFromSummary({ ...summary, startingPrice: null, coverUrl: null }).price).toBe('Price on request');
  });
});

describe('toProperty', () => {
  it('maps detail, preferring the primary photo and the lowest price', () => {
    const detail: ApiPublicProperty = {
      id: 4,
      slug: 'skyline-heights',
      projectName: 'Skyline Heights',
      location: { city: 'Hyderabad', locality: 'Kondapur', state: 'Telangana', latitude: null, longitude: null },
      apartments: [
        { id: 1, apartmentName: '3 BHK', apartmentType: '3bhk', startingPrice: 16500000, areaMin: 1650, areaMax: 1900, areaUnit: 'sq_ft' },
        { id: 2, apartmentName: '2 BHK', apartmentType: '2bhk', startingPrice: 12500000, areaMin: 1200, areaMax: 1400, areaUnit: 'sq_ft' },
      ],
      projectStatus: 'under_construction',
      possessionEndDate: '2026-12-01',
      amenities: [],
      media: [
        { id: 1, mediaType: 'photo', url: 'https://img.example/a.jpg', external: true, primary: false, sortOrder: 0 },
        { id: 2, mediaType: 'photo', url: 'https://img.example/b.jpg', external: true, primary: true, sortOrder: 1 },
        { id: 3, mediaType: 'video', url: 'https://img.example/v.mp4', external: true, primary: false, sortOrder: 2 },
      ],
    };
    expect(toProperty(detail)).toMatchObject({
      coverUrl: 'https://img.example/b.jpg',
      price: '₹1.25 Cr*',
      sqft: '1,200 - 1,900 sq.ft.',
      possession: 'Dec 2026',
      photos: 2,
      status: 'Under Construction',
    });
  });
});

describe('absoluteUrl', () => {
  it('keeps external URLs and returns undefined for none', () => {
    expect(absoluteUrl('https://x.example/a.jpg')).toBe('https://x.example/a.jpg');
    expect(absoluteUrl(null)).toBeUndefined();
  });
});

describe('map coordinates', () => {
  it('maps coordinates and a short pin price from the summary', () => {
    const p = toPropertyFromSummary(summary);
    expect(p.coordinate).toEqual({ latitude: 17.4616, longitude: 78.3645 });
    expect(p.pinLabel).toBe(formatCompactPrice(12500000));
  });
  it('leaves properties without a position off the map', () => {
    const p = toPropertyFromSummary({ ...summary, latitude: null, longitude: null, startingPrice: null });
    expect(p.coordinate).toBeUndefined();
    expect(p.pinLabel).toBe('View');
  });
  it('ignores impossible or placeholder coordinates', () => {
    expect(toCoordinate(95, 10)).toBeUndefined();
    expect(toCoordinate(10, 200)).toBeUndefined();
    expect(toCoordinate(0, 0)).toBeUndefined();
    expect(toCoordinate(18.5, null)).toBeUndefined();
  });
});
