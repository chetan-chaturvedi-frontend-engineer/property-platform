/** Client-side mirrors of the backend rules, so obvious mistakes never cost a round trip. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value.trim()) && value.trim().length <= 255;
}

/** 10-digit Indian mobile (starts 6-9), with or without +91 / 0 prefix and spaces. */
export function normalizeIndianPhone(value: string): string | null {
  const digits = value.replace(/[\s()-]/g, '');
  const match = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  return match ? `+91${match[1]}` : null;
}

/** Backend StrongPassword: 8+ characters, an uppercase letter, a digit and a special character. */
export function passwordProblem(value: string): string | null {
  if (value.length < 8) {
    return 'Use at least 8 characters';
  }
  if (!/[A-Z]/.test(value)) {
    return 'Add an uppercase letter';
  }
  if (!/\d/.test(value)) {
    return 'Add a digit';
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return 'Add a special character';
  }
  return null;
}

export function isValidOtp(value: string): boolean {
  return /^\d{4,10}$/.test(value);
}
