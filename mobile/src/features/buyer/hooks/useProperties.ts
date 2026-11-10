import { useAsync } from '../../../hooks/useAsync';
import { propertyService } from '../../../services/propertyService';

export function useProperties() {
  return useAsync(() => propertyService.list());
}

export function useProperty(id: string) {
  return useAsync(() => propertyService.getById(id), [id]);
}

export function useUnits(propertyId: string) {
  return useAsync(() => propertyService.units(propertyId), [propertyId]);
}

export function useAmenities() {
  return useAsync(() => propertyService.amenities());
}
