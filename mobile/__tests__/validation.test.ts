import { isValidEmail, isValidOtp, normalizeIndianPhone, passwordProblem } from '../src/utils/validation';

describe('normalizeIndianPhone', () => {
  it('accepts common Indian formats and returns E.164', () => {
    expect(normalizeIndianPhone('9876543210')).toBe('+919876543210');
    expect(normalizeIndianPhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizeIndianPhone('09876543210')).toBe('+919876543210');
    expect(normalizeIndianPhone('98765-43210')).toBe('+919876543210');
  });
  it('rejects short numbers and numbers not starting 6-9', () => {
    expect(normalizeIndianPhone('12345')).toBeNull();
    expect(normalizeIndianPhone('5876543210')).toBeNull();
    expect(normalizeIndianPhone('')).toBeNull();
  });
});

describe('passwordProblem', () => {
  it('names the first unmet rule', () => {
    expect(passwordProblem('Ab1!')).toMatch(/8 characters/);
    expect(passwordProblem('abcdefg1!')).toMatch(/uppercase/);
    expect(passwordProblem('Abcdefgh!')).toMatch(/digit/);
    expect(passwordProblem('Abcdefg12')).toMatch(/special/);
  });
  it('accepts a strong password', () => {
    expect(passwordProblem('Buyer@12345')).toBeNull();
  });
});

describe('isValidEmail / isValidOtp', () => {
  it('validates emails', () => {
    expect(isValidEmail('buyer@example.com')).toBe(true);
    expect(isValidEmail(' buyer@example.com ')).toBe(true);
    expect(isValidEmail('buyer@')).toBe(false);
    expect(isValidEmail('bad email@x.com')).toBe(false);
  });
  it('validates 4-10 digit codes', () => {
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('123')).toBe(false);
    expect(isValidOtp('12ab56')).toBe(false);
  });
});
