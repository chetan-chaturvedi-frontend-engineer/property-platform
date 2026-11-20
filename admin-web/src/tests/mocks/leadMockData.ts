import {
  LEAD_PRIORITIES,
  LEAD_PROPERTY_TYPES,
  LEAD_PURPOSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type Lead,
} from '@/features/leads/types/lead.types';

/** Mock leads for MSW: deterministic, so tests can count on them. Mock data only. */

const NAMES = [
  'Rahul Sharma',
  'Priya Mehta',
  'Vikram Patel',
  'Anjali Kapoor',
  'Deepak Singh',
  'Sneha Iyer',
  'Karan Malhotra',
  'Meera Nair',
  'Arjun Reddy',
  'Pooja Desai',
  'Amit Rajput',
  'Kavya Joshi',
  'Rohan Verma',
  'Isha Gupta',
];
const LOCATIONS = [
  'Vaishali Nagar, Jaipur',
  'Whitefield, Bengaluru',
  'Baner, Pune',
  'Andheri, Mumbai',
];
const BHKS = ['2', '3', '1', '2.5', '4', 'studio'];

/** Admin (id 1) and the super admin (id 4) can work on leads; see mockDb roles. */
const ASSIGNEES = [
  { id: 1, fullName: 'Asha Admin' },
  { id: 4, fullName: 'Sam Super' },
];

export function buildLeads(count: number): Lead[] {
  const start = Date.parse('2026-11-18T10:30:00Z');
  return Array.from({ length: count }, (_, index): Lead => {
    const id = 300 - index;
    const name = NAMES[index % NAMES.length] ?? 'Ravi Kumar';
    const status = LEAD_STATUSES[index % LEAD_STATUSES.length] ?? 'new';
    const budgetMin = 3_000_000 + (index % 6) * 1_500_000;
    const createdAt = new Date(start - index * 9 * 3_600_000).toISOString();
    const [first = 'lead', last = String(id)] = name.toLowerCase().split(' ');
    return {
      id,
      createdBy: { id: 1, fullName: 'Asha Admin' },
      assignedTo: index % 3 === 2 ? null : (ASSIGNEES[index % ASSIGNEES.length] ?? null),
      source: LEAD_SOURCES[index % LEAD_SOURCES.length] ?? 'other',
      status,
      priority: LEAD_PRIORITIES[index % LEAD_PRIORITIES.length] ?? 'medium',
      purpose: LEAD_PURPOSES[index % LEAD_PURPOSES.length] ?? 'buy',
      leadName: name,
      phone: `+9198765${String(43210 + index).slice(-5)}`,
      alternatePhone: null,
      email: index % 5 === 4 ? null : `${first}.${last}${id}@example.com`,
      propertyType: LEAD_PROPERTY_TYPES[index % 4] ?? null,
      bhk: BHKS[index % BHKS.length] ?? null,
      budgetMin,
      budgetMax: budgetMin + 1_500_000,
      budgetCurrency: 'INR',
      area: 900 + (index % 4) * 150,
      areaUnit: 'sq_ft',
      preferredLocation: LOCATIONS[index % LOCATIONS.length] ?? null,
      location: 'Jaipur, Rajasthan, India',
      possession: index % 2 === 0 ? 'within_1_year' : 'ready_to_move',
      moveInDate: index % 2 === 0 ? '2027-08-01' : null,
      floorPreference: index % 2 === 0 ? 'Mid floor' : null,
      facing: index % 2 === 0 ? 'east' : null,
      furnishing: index % 3 === 0 ? 'semi_furnished' : null,
      parking: index % 2 === 0 ? 'four_wheeler' : null,
      amenities: index % 2 === 0 ? ['gymnasium', 'swimming-pool'] : [],
      loanRequired: index % 2 === 0,
      additionalNote:
        index % 2 === 0 ? 'Looking for a ready to move apartment with good connectivity.' : null,
      lastContactedAt:
        index % 4 === 0 ? null : new Date(start - index * 5 * 3_600_000).toISOString(),
      nextFollowUpAt:
        index % 3 === 0 ? null : new Date(start + (index + 1) * 24 * 3_600_000).toISOString(),
      lostReason: status === 'lost' ? 'Bought elsewhere' : null,
      createdAt,
      updatedAt: index % 3 === 0 ? null : createdAt,
    };
  });
}
