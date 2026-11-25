import { Amenity, FilterState, MapBounds, Property, PropertyPage, Unit } from '../types';
import { ApiPage, ApiPublicProperty, ApiPublicPropertySummary } from '../types/api';
import { apiClient } from './api/apiClient';
import { toAmenity, toProperty, toPropertyFromSummary, toUnit } from './mappers/propertyMapper';
import { EMPTY_FILTERS, toSearchQuery } from './mappers/propertySearchMapper';

const PAGE_SIZE = 50;
/** The backend caps a page at 100; a map view never needs more pins than that. */
const MAP_PAGE_SIZE = 100;
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
  /** Server-side search: text, city, type, BHK, possession and budget are all applied by the backend. */
  async search(filters: FilterState = EMPTY_FILTERS, search = '', bounds?: MapBounds): Promise<PropertyPage> {
    const page = await apiClient.get<ApiPage<ApiPublicPropertySummary>>(
      `/public/properties?${toSearchQuery(filters, search, bounds ? MAP_PAGE_SIZE : PAGE_SIZE, bounds)}`,
    );
    return { items: page.content.map(toPropertyFromSummary), total: page.totalElements };
  },
  async list(): Promise<Property[]> {
    return (await propertyService.search()).items;
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
};
