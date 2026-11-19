import { z } from 'zod';

import {
  APARTMENT_AREA_UNITS,
  APARTMENT_TYPES,
  LAND_AREA_UNITS,
  NEARBY_PLACE_TYPES,
  PROJECT_STATUSES,
  PROPERTY_TYPES,
} from '../types/property.types';

/**
 * Mirrors the backend's request validation (`property/dto`, `PropertyFieldRules`) so most mistakes are
 * caught before a round trip; the server validates every request again. Numeric inputs are kept as
 * strings in the forms and converted when the request is built.
 */
export const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const RERA = /^[A-Za-z0-9][A-Za-z0-9/._ -]*$/;
export const PINCODE = /^[1-9][0-9]{5}$/;
const PHONE = /^\+?[0-9][0-9\s-]{6,19}$/;

export const DESCRIPTION_MAX_LENGTH = 10_000;
export const MAX_HIGHLIGHTS = 20;
export const HIGHLIGHT_MAX_LENGTH = 200;
export const MAX_APARTMENTS = 50;
export const MAX_NEARBY_PLACES = 30;

/** Allowed hosts (and their subdomains), as configured on the backend (`app.media`). */
export const TOUR_HOSTS = ['matterport.com', 'kuula.co', 'momento360.com'] as const;
export const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com'] as const;

export function isHttpsOnHost(value: string, hosts: readonly string[]): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === 'https:' &&
      hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
    );
  } catch {
    return false;
  }
}

/** Empty, or a number in [min, max] (integers only when `integer`). */
function optionalNumber(
  label: string,
  {
    min,
    max,
    integer = false,
    exclusiveMin = false,
  }: { min: number; max: number; integer?: boolean; exclusiveMin?: boolean },
) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || Number.isFinite(Number(value)), `${label} must be a number`)
    .refine(
      (value) => value === '' || !integer || Number.isInteger(Number(value)),
      `${label} must be a whole number`,
    )
    .refine(
      (value) => value === '' || (exclusiveMin ? Number(value) > min : Number(value) >= min),
      exclusiveMin ? `${label} must be more than ${min}` : `${label} must be at least ${min}`,
    )
    .refine((value) => value === '' || Number(value) <= max, `${label} must be at most ${max}`);
}

function requiredNumber(
  label: string,
  options: { min: number; max: number; integer?: boolean; exclusiveMin?: boolean },
) {
  return optionalNumber(label, options).refine(
    (value) => value !== '',
    `Enter ${label.toLowerCase()}`,
  );
}

function requiredText(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, `Enter ${label.toLowerCase()}`)
    .max(max, `${label} must be at most ${max} characters`);
}

// ---- Step 1: property details ----

export const detailsSchema = z.object({
  propertyType: z.enum(PROPERTY_TYPES, { error: 'Select a property type' }),
  projectName: requiredText('Project name', 150),
  builderCompanyName: requiredText('Builder / company name', 150),
  reraNumber: z
    .string()
    .trim()
    .max(50, 'RERA number must be at most 50 characters')
    .refine((value) => value === '' || RERA.test(value), 'Enter a valid RERA number'),
  gstNumber: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === '' || GSTIN.test(value), 'Enter a valid 15-character GSTIN'),
  projectEmail: z
    .string()
    .trim()
    .min(1, 'Enter the project email')
    .max(255, 'Must be at most 255 characters')
    .pipe(z.email('Enter a valid email address')),
  projectPhone: z
    .string()
    .trim()
    .min(1, 'Enter the project phone number')
    .max(32, 'Must be at most 32 characters')
    .regex(PHONE, 'Enter a valid phone number'),
});
export type DetailsFormValues = z.input<typeof detailsSchema>;
export type DetailsFormOutput = z.output<typeof detailsSchema>;

// ---- Step 2: location ----

export const locationSchema = z
  .object({
    projectAddress: requiredText('Address', 1000),
    city: requiredText('City', 100),
    locality: requiredText('Locality', 100),
    pincode: z.string().trim().regex(PINCODE, 'Enter a 6-digit PIN code'),
    state: requiredText('State', 100),
    landmark: z.string().trim().max(150, 'Landmark must be at most 150 characters'),
    latitude: optionalNumber('Latitude', { min: -90, max: 90 }),
    longitude: optionalNumber('Longitude', { min: -180, max: 180 }),
  })
  .superRefine((values, ctx) => {
    if ((values.latitude === '') !== (values.longitude === '')) {
      const path = values.latitude === '' ? 'latitude' : 'longitude';
      ctx.addIssue({ code: 'custom', path: [path], message: 'Enter both coordinates or neither' });
    }
  });
export type LocationFormValues = z.input<typeof locationSchema>;

// ---- Step 3: unit types ----

export const apartmentSchema = z
  .object({
    /** Existing configuration id; empty for a new one. */
    id: z.number().optional(),
    apartmentName: requiredText('Unit name', 100),
    apartmentType: z.enum(APARTMENT_TYPES, { error: 'Select a unit type' }),
    startingPrice: requiredNumber('Starting price', { min: 0, max: 999_999_999_999 }),
    bedrooms: requiredNumber('Bedrooms', { min: 0, max: 50, integer: true }),
    bathrooms: requiredNumber('Bathrooms', { min: 0, max: 50, integer: true }),
    balconies: optionalNumber('Balconies', { min: 0, max: 50, integer: true }),
    carParking: optionalNumber('Parking', { min: 0, max: 50, integer: true }),
    areaMin: requiredNumber('Minimum area', { min: 0, max: 99_999_999, exclusiveMin: true }),
    areaMax: requiredNumber('Maximum area', { min: 0, max: 99_999_999, exclusiveMin: true }),
    carpetArea: optionalNumber('Carpet area', { min: 0, max: 99_999_999, exclusiveMin: true }),
    superBuiltUpArea: optionalNumber('Super built-up area', {
      min: 0,
      max: 99_999_999,
      exclusiveMin: true,
    }),
    areaUnit: z.enum(APARTMENT_AREA_UNITS),
  })
  .superRefine((values, ctx) => {
    if (
      values.areaMin !== '' &&
      values.areaMax !== '' &&
      Number(values.areaMax) < Number(values.areaMin)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['areaMax'],
        message: 'Must not be less than the minimum',
      });
    }
  });

export const apartmentsSchema = z.object({
  apartments: z
    .array(apartmentSchema)
    .min(1, 'Add at least one unit type')
    .max(MAX_APARTMENTS, `At most ${MAX_APARTMENTS} unit types`),
});
export type ApartmentsFormValues = z.input<typeof apartmentsSchema>;
export type ApartmentFormValues = ApartmentsFormValues['apartments'][number];

// ---- Step 4: project information ----

export const projectInfoSchema = z
  .object({
    projectStatus: z.enum(PROJECT_STATUSES, { error: 'Select the construction status' }),
    totalTowersBlocks: optionalNumber('Towers / blocks', { min: 0, max: 10_000, integer: true }),
    totalUnitsFlats: optionalNumber('Total units', { min: 0, max: 1_000_000, integer: true }),
    landArea: optionalNumber('Land area', { min: 0, max: 9_999_999_999, exclusiveMin: true }),
    landAreaUnit: z.union([z.enum(LAND_AREA_UNITS), z.literal('')]),
    possessionStartDate: z.string(),
    possessionEndDate: z.string(),
    projectDescription: z
      .string()
      .max(
        DESCRIPTION_MAX_LENGTH,
        `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
      ),
    /** One highlight per line. */
    projectHighlights: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.landArea !== '' && values.landAreaUnit === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['landAreaUnit'],
        message: 'Select the unit of the land area',
      });
    }
    if (
      values.possessionStartDate &&
      values.possessionEndDate &&
      values.possessionEndDate < values.possessionStartDate
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['possessionEndDate'],
        message: 'Must not be before the start',
      });
    }
    const highlights = splitLines(values.projectHighlights);
    if (highlights.length > MAX_HIGHLIGHTS) {
      ctx.addIssue({
        code: 'custom',
        path: ['projectHighlights'],
        message: `At most ${MAX_HIGHLIGHTS} highlights`,
      });
    } else if (highlights.some((line) => line.length > HIGHLIGHT_MAX_LENGTH)) {
      ctx.addIssue({
        code: 'custom',
        path: ['projectHighlights'],
        message: `Each highlight must be at most ${HIGHLIGHT_MAX_LENGTH} characters`,
      });
    }
  });
export type ProjectInfoFormValues = z.input<typeof projectInfoSchema>;

export function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

// ---- Step 5: nearby places ----

export const nearbyPlacesSchema = z.object({
  places: z
    .array(
      z.object({
        placeName: requiredText('Place name', 150),
        placeType: z.enum(NEARBY_PLACE_TYPES, { error: 'Select a type' }),
        distanceKm: requiredNumber('Distance', { min: 0, max: 99_999.99 }),
      }),
    )
    .max(MAX_NEARBY_PLACES, `At most ${MAX_NEARBY_PLACES} places`),
});
export type NearbyPlacesFormValues = z.input<typeof nearbyPlacesSchema>;

// ---- Step 6: media settings ----

export const tourSchema = z.object({
  threeDTourUrl: z
    .string()
    .trim()
    .max(2048, 'Must be at most 2048 characters')
    .refine(
      (value) => value === '' || isHttpsOnHost(value, TOUR_HOSTS),
      `Use an https link on ${TOUR_HOSTS.join(', ')}`,
    ),
});
export type TourFormValues = z.input<typeof tourSchema>;

export const externalVideoSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Enter the video link')
    .max(2048, 'Must be at most 2048 characters')
    .refine((value) => isHttpsOnHost(value, VIDEO_HOSTS), 'Use an https YouTube or Vimeo link'),
  title: z.string().trim().max(150, 'Title must be at most 150 characters'),
});
export type ExternalVideoFormValues = z.input<typeof externalVideoSchema>;
