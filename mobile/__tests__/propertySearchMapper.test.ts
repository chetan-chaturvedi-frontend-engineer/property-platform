import { EMPTY_FILTERS, activeFilterCount, toSearchQuery } from '../src/services/mappers/propertySearchMapper';

describe('toSearchQuery', () => {
  it('sends only the page size when nothing is set', () => {
    expect(toSearchQuery(EMPTY_FILTERS, '', 50)).toBe('size=50');
  });
  it('maps every filter to the backend parameter and value', () => {
    const query = toSearchQuery(
      { budget: [5000000, 20000000], propertyType: 'Villa', bhk: '3 BHK', possession: 'New Launch', city: ' Hyderabad ' },
      ' sky ',
      20,
    );
    expect(query).toBe('size=20&search=sky&city=Hyderabad&propertyType=villa&apartmentType=3bhk&projectStatus=upcoming&minPrice=5000000&maxPrice=20000000');
  });
  it('encodes text and ignores unknown labels', () => {
    expect(toSearchQuery({ ...EMPTY_FILTERS, propertyType: 'Plot / Land' }, 'a&b c', 10)).toBe('size=10&search=a%26b%20c');
  });
});

describe('activeFilterCount', () => {
  it('counts set filters', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, city: 'Pune', bhk: '2 BHK', budget: [1, 2] })).toBe(3);
  });
});
