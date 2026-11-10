import { EmiInput, EmiResult } from '../types';

/** Standard reducing-balance EMI: P·r·(1+r)^n / ((1+r)^n − 1). */
export function calculateEmi({ principal, annualRatePct, tenureYears }: EmiInput): EmiResult {
  const months = Math.round(tenureYears * 12);
  if (principal <= 0 || months <= 0) {
    return { emi: 0, totalInterest: 0, totalPayment: 0 };
  }
  const r = annualRatePct / 12 / 100;
  const emi = r === 0 ? principal / months : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const totalPayment = emi * months;
  return { emi, totalInterest: totalPayment - principal, totalPayment };
}
