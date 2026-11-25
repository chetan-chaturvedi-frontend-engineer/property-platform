import { toApartmentsPayload, toDetailsPayload, toInfoPayload, toLocationPayload, toSellerPropertyDetail } from '../src/services/mappers/sellerPropertyMapper';
import { toMySubscription, toPlan } from '../src/services/mappers/subscriptionMapper';
import { PropertyDraft } from '../src/types';
import { ApiOwnerPropertyDetail } from '../src/types/api';

const draft: PropertyDraft = {
  propertyType: 'Villa', projectName: ' Sunrise Villas ', builderName: 'Test Estates', email: ' sales@example.com ', phone: '+919876543210',
  bhk: '3 BHK', areaSqft: '1200', price: '7500000', bathrooms: '2', address: ' Plot 12 ', locality: 'Madhapur', city: 'Hyderabad', state: 'Telangana', pincode: '500081',
  description: ' A spacious villa. ', projectStatus: 'Under Construction', amenityIds: [1], photos: [],
};

describe('wizard payloads', () => {
  it('maps step 1 and location', () => {
    expect(toDetailsPayload(draft)).toEqual({ propertyType: 'villa', projectName: 'Sunrise Villas', builderCompanyName: 'Test Estates', projectEmail: 'sales@example.com', projectPhone: '+919876543210' });
    expect(toLocationPayload(draft)).toEqual({ projectAddress: 'Plot 12', city: 'Hyderabad', locality: 'Madhapur', pincode: '500081', state: 'Telangana', latitude: null, longitude: null });
    expect(toLocationPayload({ ...draft, latitude: 17.45, longitude: 78.39 })).toMatchObject({ latitude: 17.45, longitude: 78.39 });
  });
  it('maps the single configuration', () => {
    expect(toApartmentsPayload(draft)).toEqual({ apartments: [{ apartmentName: '3 BHK', apartmentType: '3bhk', startingPrice: 7500000, bedrooms: 3, bathrooms: 2, areaMin: 1200, areaMax: 1200 }] });
    expect(toApartmentsPayload({ ...draft, bhk: 'Penthouse' }).apartments[0]).toMatchObject({ apartmentType: 'penthouse', bedrooms: 4 });
  });
  it('maps project information', () => {
    expect(toInfoPayload(draft)).toEqual({ projectStatus: 'under_construction', projectDescription: 'A spacious villa.' });
  });
});

describe('toSellerPropertyDetail', () => {
  const api: ApiOwnerPropertyDetail = {
    id: 9, slug: 's', version: 3, publicationStatus: 'rejected',
    details: { propertyType: 'villa', projectName: 'Sunrise Villas', builderCompanyName: 'B', projectEmail: 'e', projectPhone: 'p' },
    location: { projectAddress: 'a', city: 'Hyderabad', locality: 'Madhapur', pincode: '500081', state: 'Telangana' },
    apartments: [{ id: 1, apartmentName: '3 BHK', apartmentType: '3bhk', startingPrice: 7500000, areaMin: 1200, areaMax: 1200, areaUnit: 'sq_ft', bedrooms: 3, bathrooms: 2 }],
    projectInfo: { projectStatus: 'ready_to_move', projectDescription: 'Nice', possessionEndDate: null },
    amenities: [{ id: 1, name: 'Garden', slug: 'garden', category: null, icon: 'garden' }],
    media: [{ id: 1, mediaType: 'photo', url: 'https://img.example/a.jpg', external: true, primary: true, sortOrder: 0 }],
    wizard: { currentStep: 6, completedSteps: [1, 2], readyToSubmit: false, steps: [{ step: 6, key: 'media', title: 'Media', complete: false, missing: ['photos'] }, { step: 7, key: 'submit', title: 'Submit', complete: false, missing: [] }] },
    statusHistory: [{ action: 'submit', toStatus: 'pending_review', reason: null }, { action: 'reject', toStatus: 'rejected', reason: 'Photos are blurry.' }],
  };
  it('maps the owner view', () => {
    expect(toSellerPropertyDetail(api)).toMatchObject({
      id: '9', title: 'Sunrise Villas', area: 'Madhapur, Hyderabad', status: 'Inactive', rejectionReason: 'Photos are blurry.',
      readyToSubmit: false, missing: ['Media'], type: 'Villa', config: '3 BHK Apartments', price: '₹75 L*', sqft: '1,200 sq.ft.',
      amenities: ['Garden'], photoUrls: ['https://img.example/a.jpg'],
    });
  });
});

describe('subscription mappers', () => {
  const plan = { id: 2, title: 'Premium', slug: 'premium', price: 999, currency: 'INR', billingInterval: 'month' as const, billingIntervalCount: 1, description: null, noOfProperties: null, noOfTeamMembers: 0, features: ['Badge'], popular: true };
  it('labels price and limit', () => {
    expect(toPlan(plan)).toMatchObject({ priceLabel: '₹999 / month', limitLabel: 'Unlimited properties', description: '', popular: true });
    expect(toPlan({ ...plan, price: 0, noOfProperties: 1 })).toMatchObject({ priceLabel: 'Free', limitLabel: 'Up to 1 property' });
    expect(toPlan({ ...plan, billingInterval: 'year', billingIntervalCount: 2 }).priceLabel).toBe('₹999 / 2 years');
    expect(toPlan({ ...plan, billingInterval: 'lifetime' }).priceLabel).toBe('₹999 / one time');
  });
  it('maps my subscription', () => {
    expect(toMySubscription({ id: 1, planId: 2, planTitle: 'Premium', status: 'active', noOfProperties: 5, endsAt: null })).toEqual({ planTitle: 'Premium', propertyLimit: 5, endsAt: null });
  });
});
