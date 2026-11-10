import { Amenity, Property, Unit } from '../types';
import { mockAmenities, mockProperties, mockUnits } from './mockData';

const delay = <T,>(value: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(value), 150));

/** Replace bodies with apiClient.get('/properties') etc. when the backend is ready. */
export const propertyService = {
  list: (): Promise<Property[]> => delay(mockProperties),
  getById: async (id: string): Promise<Property | undefined> => delay(mockProperties.find(p => p.id === id)),
  amenities: (): Promise<Amenity[]> => delay(mockAmenities),
  units: (_propertyId: string): Promise<Unit[]> => delay(mockUnits),
};
