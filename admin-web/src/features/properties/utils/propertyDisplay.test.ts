import { areaInSqFt, formatParking, pricePerSqFt } from './propertyDisplay';
import { activityMeta } from './propertyActivity';

describe('pricePerSqFt', () => {
  it('divides the price by the area in sq.ft and rounds to whole rupees', () => {
    expect(pricePerSqFt(10_500_000, 1350, 'sq_ft')).toBe(7778);
  });

  it('converts square metres before dividing', () => {
    // 100 sq.m = 1,076.39 sq.ft.
    expect(pricePerSqFt(10_763_910, 100, 'sq_m')).toBe(10_000);
  });

  it('returns null for a missing, zero, negative or non-finite area or price', () => {
    expect(pricePerSqFt(5_000_000, null, 'sq_ft')).toBeNull();
    expect(pricePerSqFt(5_000_000, 0, 'sq_ft')).toBeNull();
    expect(pricePerSqFt(5_000_000, -10, 'sq_ft')).toBeNull();
    expect(pricePerSqFt(5_000_000, Number.NaN, 'sq_ft')).toBeNull();
    expect(pricePerSqFt(undefined, 1000, 'sq_ft')).toBeNull();
    expect(pricePerSqFt(-1, 1000, 'sq_ft')).toBeNull();
  });

  it('never uses land area units', () => {
    expect(areaInSqFt(2, 'acre')).toBeNull();
    expect(pricePerSqFt(5_000_000, 2, 'acre')).toBeNull();
  });
});

describe('formatParking', () => {
  it('describes single values, ranges, none and unknown', () => {
    expect(formatParking(1, 1)).toBe('1 parking');
    expect(formatParking(1, 2)).toBe('1–2 parking');
    expect(formatParking(0, 0)).toBe('No parking');
    expect(formatParking(undefined, undefined)).toBeNull();
  });
});

describe('activityMeta', () => {
  it('labels lifecycle and legal review events', () => {
    expect(activityMeta({ action: 'approved', toStatus: 'approved' }).label).toBe(
      'Property approved',
    );
    expect(activityMeta({ action: 'legal_status_changed', toStatus: 'pending' }).label).toBe(
      'Sent for legal review',
    );
    expect(activityMeta({ action: 'legal_status_changed', toStatus: 'unknown' }).label).toBe(
      'Legal status changed',
    );
    expect(activityMeta({ action: 'reverted_to_draft', toStatus: 'draft' }).label).toBe(
      'Updated by owner, back to draft',
    );
  });
});
