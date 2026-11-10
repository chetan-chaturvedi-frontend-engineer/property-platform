import { Booking, VisitRequest } from '../types';
import { mockBookings } from './mockData';

export const bookingService = {
  list: (): Promise<Booking[]> => Promise.resolve(mockBookings),
  /** Would POST /bookings; resolves with a generated booking id for now. */
  schedule: (_request: VisitRequest): Promise<{ bookingId: string }> =>
    Promise.resolve({ bookingId: `BK${Math.floor(10000 + Math.random() * 89999)}` }),
};
