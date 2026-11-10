import { formatCompactPrice, formatIndianNumber, initialsOf } from '../src/utils/format';

describe('format utils', () => {
  it('groups digits the Indian way', () => {
    expect(formatIndianNumber(7500000)).toBe('75,00,000');
    expect(formatIndianNumber(999)).toBe('999');
    expect(formatIndianNumber(123456)).toBe('1,23,456');
  });

  it('formats compact prices', () => {
    expect(formatCompactPrice(12500000)).toBe('₹1.25 Cr');
    expect(formatCompactPrice(7500000)).toBe('₹75 L');
  });

  it('builds initials', () => {
    expect(initialsOf('Rohan Mehta')).toBe('RM');
  });
});
