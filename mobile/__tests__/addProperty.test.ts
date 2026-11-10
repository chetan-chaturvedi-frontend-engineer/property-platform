import { validateStep } from '../src/features/seller/hooks/useAddProperty';

const draft = { purpose: 'Sell', type: 'Villa', bhk: '3 BHK', areaSqft: '1200', locality: 'Kondapur', city: 'Hyderabad', price: '7500000', negotiable: true, amenities: [] } as const;

describe('validateStep', () => {
  it('accepts a complete draft', () => {
    for (let s = 1; s <= 7; s++) {
      expect(validateStep(s, { ...draft, amenities: [] })).toBeUndefined();
    }
  });
  it('rejects bad area, locality and price', () => {
    expect(validateStep(2, { ...draft, amenities: [], areaSqft: 'abc' })).toMatch(/area/i);
    expect(validateStep(3, { ...draft, amenities: [], locality: '' })).toMatch(/locality/i);
    expect(validateStep(4, { ...draft, amenities: [], price: '12' })).toMatch(/price/i);
  });
});
