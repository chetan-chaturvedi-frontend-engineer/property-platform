import { calculateEmi } from '../src/utils/emi';

describe('calculateEmi', () => {
  it('matches the standard reducing-balance formula', () => {
    const r = calculateEmi({ principal: 6000000, annualRatePct: 8.5, tenureYears: 20 });
    expect(Math.round(r.emi)).toBe(52069);
    expect(r.totalPayment).toBeCloseTo(r.emi * 240, 2);
    expect(r.totalInterest).toBeCloseTo(r.totalPayment - 6000000, 2);
  });

  it('handles zero interest', () => {
    expect(calculateEmi({ principal: 120000, annualRatePct: 0, tenureYears: 1 }).emi).toBe(10000);
  });

  it('returns zeros for invalid input', () => {
    expect(calculateEmi({ principal: 0, annualRatePct: 8, tenureYears: 10 })).toEqual({ emi: 0, totalInterest: 0, totalPayment: 0 });
  });
});
