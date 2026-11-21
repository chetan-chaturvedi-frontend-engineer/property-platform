import { Property } from '../types';
import { ApiPublicPropertySummary } from '../types/api';
import { apiClient } from './api/apiClient';
import { toPropertyFromSummary } from './mappers/propertyMapper';

/** The signed-in user's viewing history; views also feed the owners' view counts. */
export const recentlyViewedService = {
  async list(): Promise<Property[]> {
    return (await apiClient.get<ApiPublicPropertySummary[]>('/recently-viewed')).map(toPropertyFromSummary);
  },

  /** Counts one view of a published property. */
  record: (propertyId: number) => apiClient.post<void>(`/recently-viewed/${propertyId}`),

  clear: () => apiClient.delete<void>('/recently-viewed'),
};
