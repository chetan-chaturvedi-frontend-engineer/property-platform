import { z } from 'zod';

import {
  REQUESTABLE_STATUSES,
  SITE_VISIT_INTERESTS,
  SITE_VISIT_TYPES,
} from '../types/siteVisit.types';
import { scheduleError } from '../utils/siteVisitDisplay';

/** Limits of `SiteVisit` and the request DTOs on the backend. */
export const SITE_VISIT_LIMITS = {
  name: 150,
  mobile: 32,
  email: 255,
  note: 5000,
  visitedWith: 150,
  cancellationReason: 1000,
  maxPeople: 100,
  maxDuration: 1440,
} as const;

const text = (max: number, label = 'This field') =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

// Format only; the backend normalizes to E.164 (default region India) and has the final say.
const PHONE = /^\+?[0-9][0-9\s()-]{6,24}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const picker = z.object({ id: z.number(), label: z.string(), detail: z.string().optional() });

const wholeNumber = (min: number, max: number, label: string, required: boolean) =>
  z
    .string()
    .trim()
    .refine((value) => !required || value.length > 0, `Enter the ${label}`)
    .refine(
      (value) => !value || (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max),
      `Enter a whole number from ${min} to ${max}`,
    );

const baseForm = z.object({
  property: picker.nullable(),
  lead: picker.nullable(),
  customer: picker.nullable(),
  agent: picker.nullable(),
  visitType: z.enum(SITE_VISIT_TYPES),
  visitDate: z.string().min(1, 'Select the visit date'),
  visitTime: z
    .string()
    .min(1, 'Select the visit time')
    .refine((value) => !value || TIME.test(value), 'Enter a valid time'),
  name: z
    .string()
    .trim()
    .min(1, 'Enter the visitor name')
    .max(SITE_VISIT_LIMITS.name, `Name must be at most ${SITE_VISIT_LIMITS.name} characters`),
  mobile: z
    .string()
    .trim()
    .min(1, 'Enter a mobile number')
    .max(SITE_VISIT_LIMITS.mobile, `Must be at most ${SITE_VISIT_LIMITS.mobile} characters`)
    .refine((value) => !value || PHONE.test(value), 'Enter a valid mobile number'),
  email: z
    .string()
    .trim()
    .max(SITE_VISIT_LIMITS.email, `Must be at most ${SITE_VISIT_LIMITS.email} characters`)
    .refine((value) => !value || z.email().safeParse(value).success, 'Enter a valid email address'),
  numberOfPeople: wholeNumber(1, SITE_VISIT_LIMITS.maxPeople, 'number of people', true),
  note: text(SITE_VISIT_LIMITS.note, 'The note'),
  /** `datetime-local` value in the viewer's time zone. */
  nextFollowUp: z.string(),
  followUpNote: text(SITE_VISIT_LIMITS.note, 'The follow-up note'),
});

export type SiteVisitFormValues = z.infer<typeof baseForm>;

interface FormRules {
  /** Create needs a property; edits never change it. */
  requireProperty: boolean;
  /**
   * The schedule a stored visit already has. Only a new or changed date/time is checked against the
   * booking window, so an edit of other fields never fails because the visit is today.
   */
  originalSchedule?: { visitDate: string; visitTime: string };
}

/** Mirrors `POST /admin/site-visits` and `PATCH /admin/site-visits/{id}`; the server still decides. */
export function siteVisitFormSchema({ requireProperty, originalSchedule }: FormRules) {
  return baseForm.superRefine((values, ctx) => {
    if (requireProperty && !values.property) {
      ctx.addIssue({ code: 'custom', path: ['property'], message: 'Select a property' });
    }
    const moved =
      !originalSchedule ||
      values.visitDate !== originalSchedule.visitDate ||
      values.visitTime.slice(0, 5) !== originalSchedule.visitTime.slice(0, 5);
    if (moved && values.visitDate && TIME.test(values.visitTime)) {
      const error = scheduleError(values.visitDate, values.visitTime);
      if (error) ctx.addIssue({ code: 'custom', path: [error.field], message: error.message });
    }
  });
}

/** `PATCH .../status`; whether the visit is due is checked by the dialog (it depends on the visit). */
export const siteVisitStatusSchema = z
  .object({
    status: z.union([z.enum(REQUESTABLE_STATUSES), z.literal('')]),
    cancellationReason: text(SITE_VISIT_LIMITS.cancellationReason, 'The reason'),
    /** `datetime-local`; empty = now. */
    actualVisitDate: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!values.status) {
      ctx.addIssue({ code: 'custom', path: ['status'], message: 'Select the new status' });
    }
    if (values.status === 'cancelled' && !values.cancellationReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['cancellationReason'],
        message: 'Enter the reason for cancelling',
      });
    }
    if (
      values.status === 'completed' &&
      values.actualVisitDate &&
      new Date(values.actualVisitDate).getTime() > Date.now()
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['actualVisitDate'],
        message: 'Cannot be in the future',
      });
    }
  });

export type SiteVisitStatusValues = z.infer<typeof siteVisitStatusSchema>;

/** `POST .../report`. */
export const siteVisitReportSchema = z.object({
  interest: z
    .union([z.enum(SITE_VISIT_INTERESTS), z.literal('')])
    // An explicit boolean, so TypeScript does not read this as a type predicate that drops ''.
    .refine((value): boolean => value !== '', 'Select the interest level'),
  visitNote: text(SITE_VISIT_LIMITS.note, 'The note'),
  duration: wholeNumber(1, SITE_VISIT_LIMITS.maxDuration, 'duration', false),
  visitedWith: text(SITE_VISIT_LIMITS.visitedWith, 'This field'),
  feedback: text(SITE_VISIT_LIMITS.note, 'The feedback'),
  rating: z.number().int().min(1).max(5).nullable(),
  nextFollowUp: z.string(),
  followUpNote: text(SITE_VISIT_LIMITS.note, 'The follow-up note'),
});

export type SiteVisitReportValues = z.infer<typeof siteVisitReportSchema>;
