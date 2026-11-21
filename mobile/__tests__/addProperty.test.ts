import { validateStep } from '../src/features/seller/hooks/useAddProperty';
import { PropertyDraft } from '../src/types';

const draft: PropertyDraft = {
  propertyType: 'Villa',
  projectName: 'Sunrise Villas',
  builderName: 'Test Estates',
  email: 'sales@example.com',
  phone: '9876543210',
  bhk: '3 BHK',
  areaSqft: '1200',
  price: '7500000',
  bathrooms: '2',
  address: 'Plot 12, Madhapur Road',
  locality: 'Madhapur',
  city: 'Hyderabad',
  state: 'Telangana',
  pincode: '500081',
  description: 'A spacious gated villa community near the IT corridor.',
  projectStatus: 'Ready to Move',
  amenityIds: [1, 2],
  photos: [{ uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }],
};

describe('validateStep', () => {
  it('accepts a complete draft on every step', () => {
    for (let s = 1; s <= 7; s++) {
      expect(validateStep(s, draft)).toBeUndefined();
    }
  });
  it('step 1 needs a name, builder, email and phone', () => {
    expect(validateStep(1, { ...draft, projectName: ' ' })).toMatch(/name/i);
    expect(validateStep(1, { ...draft, builderName: '' })).toMatch(/builder/i);
    expect(validateStep(1, { ...draft, email: 'nope' })).toMatch(/email/i);
    expect(validateStep(1, { ...draft, phone: '123' })).toMatch(/mobile/i);
  });
  it('step 2 checks area, price and bathrooms', () => {
    expect(validateStep(2, { ...draft, areaSqft: 'abc' })).toMatch(/area/i);
    expect(validateStep(2, { ...draft, price: '12' })).toMatch(/price/i);
    expect(validateStep(2, { ...draft, bathrooms: '0' })).toMatch(/bathrooms/i);
  });
  it('step 3 needs address, locality, city, state and a 6-digit PIN', () => {
    expect(validateStep(3, { ...draft, address: 'x' })).toMatch(/address/i);
    expect(validateStep(3, { ...draft, locality: '' })).toMatch(/locality/i);
    expect(validateStep(3, { ...draft, state: '' })).toMatch(/city and state/i);
    expect(validateStep(3, { ...draft, pincode: '5000' })).toMatch(/PIN/i);
  });
  it('steps 4 to 6 need a description, an amenity and a photo', () => {
    expect(validateStep(4, { ...draft, description: 'short' })).toMatch(/20/);
    expect(validateStep(5, { ...draft, amenityIds: [] })).toMatch(/amenity/i);
    expect(validateStep(6, { ...draft, photos: [] })).toMatch(/photo/i);
  });
});
