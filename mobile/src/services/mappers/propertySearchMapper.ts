import { FilterState, MapBounds } from '../../types';

/** Filter labels shown in the UI -> backend query values. */
export const PROPERTY_TYPES: Record<string, string> = {
  Apartment: 'apartment',
  Villa: 'villa',
  Commercial: 'commercial',
};

export const BHK_TYPES: Record<string, string> = {
  '1 BHK': '1bhk',
  '2 BHK': '2bhk',
  '3 BHK': '3bhk',
  '4 BHK': '4bhk',
  Penthouse: 'penthouse',
};

export const POSSESSION_STATUS: Record<string, string> = {
  'Ready to Move': 'ready_to_move',
  'Under Construction': 'under_construction',
  'New Launch': 'upcoming',
};

export const EMPTY_FILTERS: FilterState = { budget: null, propertyType: null, bhk: null, possession: null, city: '' };

/** Query string for GET /public/properties, omitting every filter that is not set. */
export function toSearchQuery(filters: FilterState, search: string, size: number, bounds?: MapBounds): string {
  const params: [string, string][] = [['size', String(size)]];
  const text = search.trim();
  if (text) {
    params.push(['search', text]);
  }
  if (filters.city.trim()) {
    params.push(['city', filters.city.trim()]);
  }
  if (filters.propertyType && PROPERTY_TYPES[filters.propertyType]) {
    params.push(['propertyType', PROPERTY_TYPES[filters.propertyType]]);
  }
  if (filters.bhk && BHK_TYPES[filters.bhk]) {
    params.push(['apartmentType', BHK_TYPES[filters.bhk]]);
  }
  if (filters.possession && POSSESSION_STATUS[filters.possession]) {
    params.push(['projectStatus', POSSESSION_STATUS[filters.possession]]);
  }
  if (filters.budget) {
    params.push(['minPrice', String(filters.budget[0])], ['maxPrice', String(filters.budget[1])]);
  }
  if (bounds) {
    params.push(
      ['minLat', String(bounds.minLat)],
      ['maxLat', String(bounds.maxLat)],
      ['minLng', String(bounds.minLng)],
      ['maxLng', String(bounds.maxLng)],
    );
  }
  return params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

export function activeFilterCount(filters: FilterState): number {
  return [filters.budget, filters.propertyType, filters.bhk, filters.possession, filters.city.trim()].filter(Boolean).length;
}
