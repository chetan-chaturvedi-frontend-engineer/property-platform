import {
  SITE_VISIT_STATUSES,
  SITE_VISIT_TYPES,
  type SiteVisit,
  type SiteVisitProperty,
} from '@/features/siteVisits/types/siteVisit.types';
import { addDays, propertyNow } from '@/features/siteVisits/utils/siteVisitDisplay';

/**
 * Mock site visits for MSW: deterministic statuses and names, so tests can count on them. Dates are
 * relative to today at the property, so upcoming visits stay in the future. Mock data only.
 */

const NAMES = [
  'Amit Rajput',
  'Pooja Singh',
  'Rahul Kumar',
  'Neha Shah',
  'Vikram Jain',
  'Meera Gupta',
  'Deepak Kapoor',
  'Arjun Joshi',
  'Sonal Mehta',
  'Priya Rana',
];

/** Properties 1-4 of the property mock (same ids and names). */
export const MOCK_VISIT_PROPERTIES: SiteVisitProperty[] = [
  {
    id: 1,
    projectName: 'Dream Heights Apartments',
    slug: 'dream-heights-apartments-1',
    city: 'Jaipur',
    locality: 'Vaishali Nagar',
  },
  {
    id: 2,
    projectName: 'Skyline Residency',
    slug: 'skyline-residency-2',
    city: 'Pune',
    locality: 'Baner',
  },
  {
    id: 3,
    projectName: 'Green Valley Villas',
    slug: 'green-valley-villas-3',
    city: 'Bengaluru',
    locality: 'Whitefield',
  },
  {
    id: 4,
    projectName: 'Urban Square Commercial',
    slug: 'urban-square-commercial-4',
    city: 'Mumbai',
    locality: 'Andheri',
  },
];

/** The admin (1) and the super admin (4) can be assigned; see mockDb roles. */
const AGENTS = [
  { id: 1, fullName: 'Asha Admin' },
  { id: 4, fullName: 'Sam Super' },
];

const TIMES = ['10:00:00', '11:30:00', '14:30:00', '16:00:00', '17:30:00'];

export function buildSiteVisits(count: number, now: Date = new Date()): SiteVisit[] {
  const today = propertyNow(now).date;
  const created = Date.parse(`${today}T04:30:00Z`);
  return Array.from({ length: count }, (_, index): SiteVisit => {
    const id = 200 - index;
    const status = SITE_VISIT_STATUSES[index % SITE_VISIT_STATUSES.length] ?? 'scheduled';
    const upcoming = status === 'scheduled' || status === 'confirmed' || status === 'rescheduled';
    const visitDate = addDays(today, upcoming ? 1 + (index % 20) : -1 - (index % 20));
    const name = NAMES[index % NAMES.length] ?? 'Ravi Kumar';
    const property =
      MOCK_VISIT_PROPERTIES[index % MOCK_VISIT_PROPERTIES.length] ?? MOCK_VISIT_PROPERTIES[0];
    const createdAt = new Date(created - index * 7 * 3_600_000).toISOString();
    const completed = status === 'completed';
    return {
      id,
      visitCode: `SV-${100000 + id}`,
      property: property ?? {
        id: 1,
        projectName: 'Property',
        slug: null,
        city: null,
        locality: null,
      },
      builder: { id: 7, fullName: 'Rajesh Sharma' },
      customer: index % 3 === 0 ? { id: 3, fullName: 'Uma User' } : null,
      assignee: index % 4 === 3 ? null : (AGENTS[index % AGENTS.length] ?? null),
      assignedAt: index % 4 === 3 ? null : createdAt,
      scheduledBy: { id: 1, fullName: 'Asha Admin' },
      leadId: index % 2 === 0 ? 300 - index : null,
      visitType: SITE_VISIT_TYPES[index % 5 === 4 ? 1 : index % 7 === 6 ? 2 : 0] ?? 'site_visit',
      visitDate,
      visitTime: TIMES[index % TIMES.length] ?? '10:00:00',
      status,
      name,
      mobile: `+9198765${String(43210 + index).slice(-5)}`,
      email: index % 4 === 1 ? null : `${name.toLowerCase().replace(' ', '.')}${id}@example.com`,
      numberOfPeople: 1 + (index % 4),
      note: index % 3 === 0 ? 'Prefers a morning slot.' : null,
      actualVisitDate: completed
        ? new Date(Date.parse(`${visitDate}T05:00:00Z`)).toISOString()
        : null,
      cancelledAt: status === 'cancelled' ? createdAt : null,
      cancellationReason: status === 'cancelled' ? 'Travelling that week' : null,
      report:
        completed && index % 2 === 1
          ? {
              interest: 'high',
              visitNote: 'Liked the clubhouse',
              duration: 45,
              visitedWith: 'Spouse',
              feedback: 'Good',
              rating: 4,
              submittedBy: AGENTS[0] ?? null,
            }
          : null,
      nextFollowUp:
        index % 3 === 1 ? new Date(created + (index + 2) * 86_400_000).toISOString() : null,
      followUpNote: index % 3 === 1 ? 'Send price sheet' : null,
      createdAt,
      updatedAt: index % 2 === 0 ? createdAt : new Date(created - index * 3_600_000).toISOString(),
    };
  });
}
