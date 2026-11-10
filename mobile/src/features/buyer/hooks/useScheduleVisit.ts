import { useState } from 'react';
import { bookingService } from '../../../services/bookingService';
import { VisitType } from '../../../types';

export const TIME_SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];

export function useScheduleVisit(propertyId: string) {
  const [type, setType] = useState<VisitType>('Site Visit');
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState('02:00 PM');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingId, setBookingId] = useState<string>();

  const isValid = fullName.trim().length > 1 && /^\d{10}$/.test(mobile) && /\S+@\S+\.\S+/.test(email);

  async function submit() {
    if (!isValid) {
      return false;
    }
    const { bookingId: id } = await bookingService.schedule({
      propertyId,
      type,
      date: String(dayIndex),
      time,
      fullName,
      mobile,
      email,
      people: '1',
      notes,
    });
    setBookingId(id);
    return true;
  }

  return { type, setType, dayIndex, setDayIndex, time, setTime, fullName, setFullName, mobile, setMobile, email, setEmail, notes, setNotes, isValid, submit, bookingId };
}
