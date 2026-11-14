import { Booking, BookingStatus, VisitRequest, VisitType } from '../../types';
import { ApiSiteVisit, ApiVisitStatus, ApiVisitType } from '../../types/api';
import { formatTime12, formatVisitDate, weekdayOf } from '../../utils/dates';

const TYPE_LABEL: Record<ApiVisitType, VisitType> = {
  site_visit: 'Site Visit',
  virtual_visit: 'Virtual Tour',
  revisit: 'Site Visit',
};

/** The backend has no separate video-call type, so a video call is booked as a virtual visit. */
const TYPE_VALUE: Record<VisitType, ApiVisitType> = {
  'Site Visit': 'site_visit',
  'Video Call': 'virtual_visit',
  'Virtual Tour': 'virtual_visit',
};

const STATUS: Record<ApiVisitStatus, BookingStatus> = {
  scheduled: 'Upcoming',
  confirmed: 'Upcoming',
  rescheduled: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'Cancelled',
};

export function toBooking(v: ApiSiteVisit): Booking {
  return {
    id: v.visitCode,
    visitId: v.id,
    name: v.property.projectName,
    config: '',
    area: [v.property.locality, v.property.city].filter(Boolean).join(', '),
    date: formatVisitDate(v.visitDate),
    day: weekdayOf(v.visitDate),
    time: formatTime12(v.visitTime),
    type: TYPE_LABEL[v.visitType],
    status: STATUS[v.status],
  };
}

/** Request body of POST /site-visits; optional fields are omitted when blank (the API rejects empty ones). */
export function toVisitPayload(r: VisitRequest) {
  return {
    propertyId: r.propertyId,
    visitType: TYPE_VALUE[r.type],
    visitDate: r.date,
    visitTime: r.time,
    name: r.fullName.trim(),
    mobile: r.mobile,
    ...(r.email.trim() ? { email: r.email.trim() } : {}),
    numberOfPeople: r.people,
    ...(r.notes?.trim() ? { note: r.notes.trim() } : {}),
  };
}
