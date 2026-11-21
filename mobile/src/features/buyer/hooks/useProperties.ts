import { useAsync } from '../../../hooks/useAsync';
import { propertyService } from '../../../services/propertyService';
import { usePropertyFilters } from '../PropertyFiltersProvider';

/** Unfiltered list (Saved, Recently viewed and Compare until they have their own endpoints). */
export function useProperties() {
  return useAsync(() => propertyService.list());
}

export function useProperty(id: string) {
  return useAsync(() => propertyService.getById(id), [id]);
}

export function useUnits(propertyId: string) {
  return useAsync(() => propertyService.units(propertyId), [propertyId]);
}

/** Amenities of one published property. */
export function usePropertyAmenities(propertyId: string) {
  return useAsync(() => propertyService.amenities(propertyId), [propertyId]);
}


/** Home and Search: results for the current search text and filters, with the total match count. */
export function usePropertySearch() {
  const { filters, search } = usePropertyFilters();
  return useAsync(() => propertyService.search(filters, search), [JSON.stringify(filters), search]);
}
