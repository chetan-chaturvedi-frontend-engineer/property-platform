import { useMemo, useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { bookingService } from '../../../services/bookingService';
import { Property, VisitType } from '../../../types';
import { to24Hour, upcomingDays } from '../../../utils/dates';
import { isValidEmail, normalizeIndianPhone } from '../../../utils/validation';
import { useAuth } from '../../auth/AuthProvider';

export const TIME_SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];
const DAY_COUNT = 7;

export type BookOutcome =
  | { outcome: 'booked'; bookingId: string }
  | { outcome: 'needsLogin' }
  | { outcome: 'invalid' | 'failed'; message: string };

export function useScheduleVisit(property: Property | undefined) {
  const { status, user } = useAuth();
  const days = useMemo(() => upcomingDays(DAY_COUNT), []);
  const [type, setType] = useState<VisitType>('Site Visit');
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState('02:00 PM');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const phone = normalizeIndianPhone(mobile);
  const isValid = fullName.trim().length > 1 && phone !== null && isValidEmail(email);

  async function submit(): Promise<BookOutcome> {
    if (status !== 'signedIn') {
      return { outcome: 'needsLogin' };
    }
    if (!isValid || !phone) {
      return { outcome: 'invalid', message: 'Enter a name, 10-digit mobile number and a valid email.' };
    }
    if (!property) {
      return { outcome: 'failed', message: 'The property is still loading. Try again in a moment.' };
    }
    setSubmitting(true);
    try {
      const { bookingId } = await bookingService.schedule({
        propertyId: property.propertyId,
        type,
        date: days[dayIndex].iso,
        time: to24Hour(time),
        fullName,
        mobile: phone,
        email,
        people: 1,
        notes,
      });
      return { outcome: 'booked', bookingId };
    } catch (e) {
      const fields = e instanceof ApiError ? Object.values(e.fieldErrors).join(' ') : '';
      const message = e instanceof ApiError ? fields || e.message : 'Could not reach the server. Check your connection.';
      return { outcome: 'failed', message };
    } finally {
      setSubmitting(false);
    }
  }

  return { days, type, setType, dayIndex, setDayIndex, time, setTime, fullName, setFullName, mobile, setMobile, email, setEmail, notes, setNotes, isValid, submitting, submit };
}
