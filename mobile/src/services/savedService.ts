import { Property } from '../types';
import { ApiPage, ApiPublicPropertySummary } from '../types/api';
import { apiClient } from './api/apiClient';
import { toPropertyFromSummary } from './mappers/propertyMapper';

const PAGE_SIZE = 100;

/** The signed-in user's shortlist of published properties. */
export const savedService = {
  async list(): Promise<Property[]> {
    const page = await apiClient.get<ApiPage<ApiPublicPropertySummary>>(`/saved-properties?size=${PAGE_SIZE}`);
    return page.content.map(toPropertyFromSummary);
  },

  /** Ids of saved properties, to show which cards are hearted. */
  ids: () => apiClient.get<number[]>('/saved-properties/ids'),

  save: (propertyId: number) => apiClient.put<void>(`/saved-properties/${propertyId}`),
  unsave: (propertyId: number) => apiClient.delete<void>(`/saved-properties/${propertyId}`),
};
