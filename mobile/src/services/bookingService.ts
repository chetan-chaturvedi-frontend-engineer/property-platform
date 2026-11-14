import { Booking, VisitRequest } from '../types';
import { ApiPage, ApiSiteVisit } from '../types/api';
import { apiClient } from './api/apiClient';
import { toBooking, toVisitPayload } from './mappers/bookingMapper';

const PAGE_SIZE = 50;

export const bookingService = {
  /** The signed-in user's own bookings (visits where they are the visitor), newest visit first. */
  async list(): Promise<Booking[]> {
    const page = await apiClient.get<ApiPage<ApiSiteVisit>>(`/site-visits?relation=visitor&size=${PAGE_SIZE}`);
    return page.content.map(toBooking);
  },

  /** Books a visit; resolves with the visit code (e.g. SV-100012). */
  async schedule(request: VisitRequest): Promise<{ bookingId: string }> {
    const visit = await apiClient.post<ApiSiteVisit>('/site-visits', toVisitPayload(request));
    return { bookingId: visit.visitCode };
  },

  async cancel(visitId: number): Promise<void> {
    await apiClient.patch<ApiSiteVisit>(`/site-visits/${visitId}/status`, {
      status: 'cancelled',
      cancellationReason: 'Cancelled by visitor',
    });
  },
};
