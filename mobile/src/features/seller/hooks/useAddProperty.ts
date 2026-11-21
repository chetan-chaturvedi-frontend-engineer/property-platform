import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { sellerPropertyService } from '../../../services/sellerPropertyService';
import { PropertyDraft } from '../../../types';
import { isValidEmail, normalizeIndianPhone } from '../../../utils/validation';
import { useAuth } from '../../auth/AuthProvider';

export const TOTAL_STEPS = 7;
export const STEP_TITLES = ['Listing Type', 'Property Details', 'Location', 'About', 'Amenities', 'Photos', 'Review & Submit'];
export const MAX_PHOTO_COUNT = 10;

const initial: PropertyDraft = {
  propertyType: 'Apartment',
  projectName: '',
  builderName: '',
  email: '',
  phone: '',
  bhk: '2 BHK',
  areaSqft: '',
  price: '',
  bathrooms: '2',
  address: '',
  locality: '',
  city: '',
  state: '',
  pincode: '',
  description: '',
  projectStatus: 'Ready to Move',
  amenityIds: [],
  photos: [],
};

/** Validation per step: returns an error message, or undefined when the step is complete. */
export function validateStep(step: number, d: PropertyDraft): string | undefined {
  switch (step) {
    case 1:
      if (d.projectName.trim().length < 2) {
        return 'Enter the property or project name.';
      }
      if (d.builderName.trim().length < 2) {
        return 'Enter the builder or owner name.';
      }
      if (!isValidEmail(d.email)) {
        return 'Enter a valid contact email.';
      }
      return normalizeIndianPhone(d.phone) ? undefined : 'Enter a 10-digit contact mobile number.';
    case 2:
      if (!/^\d{3,5}$/.test(d.areaSqft)) {
        return 'Enter the built-up area in sq.ft. (3–5 digits).';
      }
      if (!/^\d{5,10}$/.test(d.price)) {
        return 'Enter a valid expected price (digits only).';
      }
      return /^([1-9]|10)$/.test(d.bathrooms) ? undefined : 'Enter the number of bathrooms (1–10).';
    case 3:
      if (d.address.trim().length < 5) {
        return 'Enter the address.';
      }
      if (d.locality.trim().length < 2) {
        return 'Enter the locality.';
      }
      if (d.city.trim().length < 2 || d.state.trim().length < 2) {
        return 'Enter the city and state.';
      }
      return /^\d{6}$/.test(d.pincode) ? undefined : 'Enter a 6-digit PIN code.';
    case 4:
      return d.description.trim().length >= 20 ? undefined : 'Describe the property in at least 20 characters.';
    case 5:
      return d.amenityIds.length > 0 ? undefined : 'Select at least one amenity.';
    case 6:
      return d.photos.length > 0 ? undefined : 'Add at least one photo.';
    default:
      return undefined;
  }
}

export type NextOutcome = 'continued' | 'submitted' | 'blocked' | 'needsSubscription';

const SUBSCRIPTION_CODES = ['subscription_required', 'subscription_expired', 'property_limit_reached'];

export function useAddProperty() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<PropertyDraft>(initial);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [propertyId, setPropertyId] = useState<number>();
  const uploaded = useRef(0);
  const idempotencyKey = useRef<string | undefined>(undefined);

  // Contact details default to the account's own.
  useEffect(() => {
    if (user) {
      setDraft(d => ({ ...d, email: d.email || user.email, phone: d.phone || user.phone.replace(/^\+91/, '') }));
    }
  }, [user]);

  const update = <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => setDraft(d => ({ ...d, [key]: value }));
  const toggleAmenity = (id: number) =>
    setDraft(d => ({ ...d, amenityIds: d.amenityIds.includes(id) ? d.amenityIds.filter(a => a !== id) : [...d.amenityIds, id] }));
  const addPhotos = (photos: PropertyDraft['photos']) => setDraft(d => ({ ...d, photos: [...d.photos, ...photos].slice(0, MAX_PHOTO_COUNT) }));
  const removePhoto = (index: number) => setDraft(d => ({ ...d, photos: d.photos.filter((_, i) => i !== index) }));

  /** Writes the current step to the backend; the draft is created on step 1. */
  async function save(current: number, d: PropertyDraft): Promise<number | undefined> {
    const body = { ...d, phone: normalizeIndianPhone(d.phone) ?? d.phone };
    switch (current) {
      case 1:
        if (propertyId === undefined) {
          idempotencyKey.current ??= `app-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          const id = await sellerPropertyService.createDraft(body, idempotencyKey.current);
          setPropertyId(id);
          return id;
        }
        await sellerPropertyService.saveDetails(propertyId, body);
        return propertyId;
      case 2:
        await sellerPropertyService.saveApartments(propertyId as number, body);
        return propertyId;
      case 3:
        await sellerPropertyService.saveLocation(propertyId as number, body);
        return propertyId;
      case 4:
        await sellerPropertyService.saveInfo(propertyId as number, body);
        return propertyId;
      case 5:
        await sellerPropertyService.saveAmenities(propertyId as number, d.amenityIds);
        return propertyId;
      case 6:
        // Photos already uploaded stay; only new ones are sent, the first of all becomes the cover.
        for (let i = uploaded.current; i < d.photos.length; i++) {
          await sellerPropertyService.uploadPhoto(propertyId as number, d.photos[i], i === 0);
          uploaded.current = i + 1;
        }
        return propertyId;
      default:
        return propertyId;
    }
  }

  /** Validates and saves the step, then moves on; on the last step it submits the property for review. */
  async function next(): Promise<NextOutcome> {
    const invalid = validateStep(step, draft);
    setError(invalid);
    if (invalid || saving) {
      return 'blocked';
    }
    setSaving(true);
    try {
      const id = await save(step, draft);
      if (step === TOTAL_STEPS && id !== undefined) {
        const preview = await sellerPropertyService.preview(id);
        if (!preview.readyToSubmit) {
          setError(`Still missing: ${preview.missing.join(', ')}.`);
          return 'blocked';
        }
        await sellerPropertyService.submit(id);
        return 'submitted';
      }
      setStep(s => Math.min(TOTAL_STEPS, s + 1));
      return 'continued';
    } catch (e) {
      if (e instanceof ApiError && e.code && SUBSCRIPTION_CODES.includes(e.code)) {
        setError(e.message);
        return 'needsSubscription';
      }
      const fields = e instanceof ApiError ? Object.values(e.fieldErrors).join(' ') : '';
      setError(e instanceof ApiError ? fields || e.message : 'Could not reach the server. Check your connection.');
      return 'blocked';
    } finally {
      setSaving(false);
    }
  }

  const back = () => {
    setError(undefined);
    setStep(s => Math.max(1, s - 1));
  };

  return { step, draft, update, toggleAmenity, addPhotos, removePhoto, next, back, error, saving, propertyId };
}
