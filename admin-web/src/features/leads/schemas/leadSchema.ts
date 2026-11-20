import { z } from 'zod';

import {
  AREA_UNITS,
  FACINGS,
  FURNISHINGS,
  LEAD_PRIORITIES,
  LEAD_PROPERTY_TYPES,
  LEAD_PURPOSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PARKING_PREFERENCES,
  POSSESSION_TIMELINES,
} from '../types/lead.types';

/** Limits of `CreateLeadRequest` / `Lead` on the backend. */
export const LEAD_LIMITS = {
  leadName: 150,
  phone: 32,
  email: 255,
  preferredLocation: 500,
  location: 255,
  floorPreference: 50,
  additionalNote: 5000,
  lostReason: 500,
  amenities: 50,
} as const;

/** An optional select: one of the values, or '' for "not set". */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.literal('')]);

const text = (max: number, label = 'This field') =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

// Format only; the backend normalizes to E.164 (default region India) and has the final say.
const PHONE = /^\+?[0-9][0-9\s()-]{6,24}$/;
const MONEY = /^\d{1,12}(\.\d{1,2})?$/;
const AREA = /^\d{1,10}(\.\d{1,2})?$/;

const phone = (required: boolean) =>
  z
    .string()
    .trim()
    .max(LEAD_LIMITS.phone, `Must be at most ${LEAD_LIMITS.phone} characters`)
    .refine((value) => (required ? value.length > 0 : true), 'Enter a phone number')
    .refine((value) => !value || PHONE.test(value), 'Enter a valid phone number');

const amount = (pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || pattern.test(value), message);

/** Mirrors `POST /admin/leads` and `PATCH /admin/leads/{id}`; the server still validates everything. */
export const leadFormSchema = z
  .object({
    leadName: z
      .string()
      .trim()
      .min(1, 'Enter the lead name')
      .max(LEAD_LIMITS.leadName, `Name must be at most ${LEAD_LIMITS.leadName} characters`),
    phone: phone(true),
    alternatePhone: phone(false),
    email: z
      .string()
      .trim()
      .max(LEAD_LIMITS.email, `Must be at most ${LEAD_LIMITS.email} characters`)
      .refine(
        (value) => !value || z.email().safeParse(value).success,
        'Enter a valid email address',
      ),
    purpose: optionalEnum(LEAD_PURPOSES).refine((value) => value.length > 0, 'Select a purpose'),
    source: z.enum(LEAD_SOURCES),
    status: z.enum(LEAD_STATUSES),
    priority: z.enum(LEAD_PRIORITIES),
    propertyType: optionalEnum(LEAD_PROPERTY_TYPES),
    bhk: z.string(),
    budgetMin: amount(MONEY, 'Enter an amount with up to 2 decimals'),
    budgetMax: amount(MONEY, 'Enter an amount with up to 2 decimals'),
    budgetCurrency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code such as INR'),
    area: amount(AREA, 'Enter a positive area with up to 2 decimals'),
    areaUnit: optionalEnum(AREA_UNITS),
    preferredLocation: text(LEAD_LIMITS.preferredLocation, 'Preferred location'),
    location: text(LEAD_LIMITS.location, 'Current location'),
    possession: optionalEnum(POSSESSION_TIMELINES),
    moveInDate: z.string(),
    floorPreference: text(LEAD_LIMITS.floorPreference, 'Floor preference'),
    facing: optionalEnum(FACINGS),
    furnishing: optionalEnum(FURNISHINGS),
    parking: optionalEnum(PARKING_PREFERENCES),
    amenities: z
      .array(z.string())
      .max(LEAD_LIMITS.amenities, `Select at most ${LEAD_LIMITS.amenities} amenities`),
    loanRequired: z.boolean(),
    additionalNote: text(LEAD_LIMITS.additionalNote, 'The note'),
    /** `datetime-local` value in the viewer's time zone. */
    nextFollowUpAt: z.string(),
    lostReason: text(LEAD_LIMITS.lostReason, 'The reason'),
    /** Create only, with `LEAD_ASSIGN`; afterwards the assignee changes through /assign. */
    assignee: z.object({ id: z.number(), fullName: z.string(), email: z.string() }).nullable(),
  })
  .superRefine((values, ctx) => {
    if (
      values.budgetMin &&
      values.budgetMax &&
      Number(values.budgetMax) < Number(values.budgetMin)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['budgetMax'],
        message: 'Must not be less than the minimum budget',
      });
    }
    if (values.area && Number(values.area) <= 0) {
      ctx.addIssue({ code: 'custom', path: ['area'], message: 'Area must be greater than 0' });
    }
    if (values.area && !values.areaUnit) {
      ctx.addIssue({ code: 'custom', path: ['areaUnit'], message: 'Select the unit of the area' });
    }
    if (values.status === 'lost' && !values.lostReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['lostReason'],
        message: 'Give a reason when the lead is lost',
      });
    }
  });

export type LeadFormValues = z.infer<typeof leadFormSchema>;

/** Status change from the details page: a lost lead needs a reason. */
export const leadStatusSchema = z
  .object({
    status: z.enum(LEAD_STATUSES),
    lostReason: text(LEAD_LIMITS.lostReason, 'The reason'),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'lost' && !values.lostReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['lostReason'],
        message: 'Give a reason when the lead is lost',
      });
    }
  });

export type LeadStatusValues = z.infer<typeof leadStatusSchema>;
