import { useState } from 'react';

export const TOTAL_STEPS = 7;

export interface PropertyDraft {
  purpose: 'Sell' | 'Rent';
  type: string;
  bhk: string;
  areaSqft: string;
  locality: string;
  city: string;
  price: string;
  negotiable: boolean;
  amenities: string[];
}

const initial: PropertyDraft = {
  purpose: 'Sell',
  type: 'Apartment / Flat',
  bhk: '2 BHK',
  areaSqft: '',
  locality: '',
  city: 'Hyderabad',
  price: '',
  negotiable: true,
  amenities: [],
};

/** Validation per step: returns an error message, or undefined when the step is complete. */
export function validateStep(step: number, d: PropertyDraft): string | undefined {
  if (step === 2 && !/^\d{3,5}$/.test(d.areaSqft)) {
    return 'Enter the built-up area in sq.ft. (3–5 digits).';
  }
  if (step === 3 && d.locality.trim().length < 2) {
    return 'Enter the locality.';
  }
  if (step === 4 && !/^\d{5,10}$/.test(d.price)) {
    return 'Enter a valid expected price (digits only).';
  }
  return undefined;
}

export function useAddProperty() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<PropertyDraft>(initial);
  const [error, setError] = useState<string>();

  const update = <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => setDraft(d => ({ ...d, [key]: value }));
  const toggleAmenity = (name: string) =>
    setDraft(d => ({ ...d, amenities: d.amenities.includes(name) ? d.amenities.filter(a => a !== name) : [...d.amenities, name] }));

  /** Returns true when the flow is finished (last step passed validation). */
  function next(): boolean {
    const err = validateStep(step, draft);
    setError(err);
    if (err) {
      return false;
    }
    if (step === TOTAL_STEPS) {
      return true;
    }
    setStep(s => s + 1);
    return false;
  }
  const back = () => {
    setError(undefined);
    setStep(s => Math.max(1, s - 1));
  };

  return { step, draft, update, toggleAmenity, next, back, error };
}
