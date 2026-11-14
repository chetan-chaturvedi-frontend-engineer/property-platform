import { Amenity, Property, Unit } from '../types';
import { ApiPage, ApiPublicProperty, ApiPublicPropertySummary } from '../types/api';
import { apiClient } from './api/apiClient';
import { mockAmenities } from './mockData';
import { toAmenity, toProperty, toPropertyFromSummary, toUnit } from './mappers/propertyMapper';

const PAGE_SIZE = 50;
const DETAIL_TTL_MS = 30_000;

/** Detail, units and amenities of one screen share a single request. */
const detailCache = new Map<string, { at: number; request: Promise<ApiPublicProperty> }>();

function detail(slug: string): Promise<ApiPublicProperty> {
  const cached = detailCache.get(slug);
  if (cached && Date.now() - cached.at < DETAIL_TTL_MS) {
    return cached.request;
  }
  const request = apiClient.get<ApiPublicProperty>(`/public/properties/${encodeURIComponent(slug)}`);
  detailCache.set(slug, { at: Date.now(), request });
  request.catch(() => detailCache.delete(slug));
  return request;
}

export const propertyService = {
  async list(): Promise<Property[]> {
    const page = await apiClient.get<ApiPage<ApiPublicPropertySummary>>(`/public/properties?size=${PAGE_SIZE}`);
    return page.content.map(toPropertyFromSummary);
  },
  async getById(slug: string): Promise<Property> {
    return toProperty(await detail(slug));
  },
  async units(slug: string): Promise<Unit[]> {
    return (await detail(slug)).apartments.map(toUnit);
  },
  async amenities(slug: string): Promise<Amenity[]> {
    return (await detail(slug)).amenities.map(toAmenity);
  },
  /** Full amenity catalogue for compare/seller forms. TODO: GET /amenities needs a signed-in user. */
  amenityCatalog: (): Promise<Amenity[]> => Promise.resolve(mockAmenities),
};
