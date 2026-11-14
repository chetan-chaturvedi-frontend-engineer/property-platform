import { toBooking, toVisitPayload } from '../src/services/mappers/bookingMapper';
import { toSellerLead, toSellerListing } from '../src/services/mappers/sellerMapper';
import { ApiSiteVisit } from '../src/types/api';

const visit: ApiSiteVisit = {
  id: 12,
  visitCode: 'SV-100012',
  property: { id: 4, projectName: 'Skyline Heights', slug: 'skyline-heights', city: 'Hyderabad', locality: 'Kondapur' },
  visitType: 'site_visit',
  visitDate: '2026-05-22',
  visitTime: '14:00:00',
  status: 'confirmed',
};

describe('toBooking', () => {
  it('maps a visit to a booking card', () => {
    expect(toBooking(visit)).toMatchObject({
      id: 'SV-100012',
      visitId: 12,
      name: 'Skyline Heights',
      area: 'Kondapur, Hyderabad',
      date: '22 May 2026',
      day: 'Friday',
      time: '02:00 PM',
      type: 'Site Visit',
      status: 'Upcoming',
    });
  });
  it('maps statuses and types', () => {
    expect(toBooking({ ...visit, status: 'completed' }).status).toBe('Completed');
    expect(toBooking({ ...visit, status: 'cancelled' }).status).toBe('Cancelled');
    expect(toBooking({ ...visit, status: 'rescheduled' }).status).toBe('Upcoming');
    expect(toBooking({ ...visit, visitType: 'virtual_visit' }).type).toBe('Virtual Tour');
  });
});

describe('toVisitPayload', () => {
  const base = { propertyId: 4, type: 'Site Visit' as const, date: '2026-05-22', time: '14:00', fullName: ' Ravi Kumar ', mobile: '+919876543210', email: 'ravi@example.com', people: 1 };
  it('builds the request and trims text', () => {
    expect(toVisitPayload({ ...base, notes: ' Near lift ' })).toEqual({
      propertyId: 4,
      visitType: 'site_visit',
      visitDate: '2026-05-22',
      visitTime: '14:00',
      name: 'Ravi Kumar',
      mobile: '+919876543210',
      email: 'ravi@example.com',
      numberOfPeople: 1,
      note: 'Near lift',
    });
  });
  it('omits blank optional fields and maps video calls to virtual visits', () => {
    const payload = toVisitPayload({ ...base, type: 'Video Call', email: ' ', notes: '  ' });
    expect(payload.visitType).toBe('virtual_visit');
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('note');
  });
});

describe('seller mappers', () => {
  it('maps owner properties by publication status', () => {
    const p = { id: 7, slug: 's', projectName: 'Sunrise Villas', city: 'Pune', locality: 'Baner', publicationStatus: 'draft' as const, updatedAt: '' };
    expect(toSellerListing(p)).toMatchObject({ id: '7', title: 'Sunrise Villas', area: 'Baner, Pune', purpose: 'Draft', status: 'Incomplete' });
    expect(toSellerListing({ ...p, publicationStatus: 'published' })).toMatchObject({ purpose: 'For Sale', status: 'Active' });
    expect(toSellerListing({ ...p, publicationStatus: 'pending_review' }).status).toBe('Under Review');
    expect(toSellerListing({ ...p, publicationStatus: 'suspended' }).status).toBe('Inactive');
  });
  it('maps leads with a requirement summary', () => {
    const now = new Date(2026, 4, 22, 12, 0);
    const lead = { id: 3, status: 'new', leadName: 'Priya Sharma', bhk: '3', preferredLocation: 'Kondapur', createdAt: new Date(2026, 4, 21, 9, 0).toISOString() };
    expect(toSellerLead(lead, now)).toMatchObject({
      id: '3',
      name: 'Priya Sharma',
      initials: 'PS',
      kind: 'New Lead',
      message: 'Looking for 3 BHK in Kondapur',
      time: 'Yesterday',
      unread: 1,
    });
    expect(toSellerLead({ ...lead, status: 'contacted', bhk: null, preferredLocation: null }, now)).toMatchObject({
      kind: 'Lead',
      message: 'No requirements added yet',
      unread: 0,
    });
  });
});
