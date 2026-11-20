import { z } from 'zod';

import { BILLING_INTERVALS, PLAN_STATUSES } from '../types/subscriptionPlan.types';

/** Limits of `SubscriptionPlan` on the backend (shared by its request DTOs). */
export const PLAN_LIMITS = {
  title: 100,
  slug: 120,
  icon: 100,
  photo: 2048,
  description: 5000,
  maxFeatures: 50,
  feature: 200,
  maxBillingIntervalCount: 36,
  maxProperties: 1_000_000,
  maxTeamMembers: 10_000,
  maxSortOrder: 100_000,
  maxTrialDays: 365,
} as const;

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ICON_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;
/** An https URL, or a relative storage key without "..". */
const PHOTO_PATTERN = /^(https:\/\/\S+|(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9/_.-]*)$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
/** Max 12 integer digits and 2 decimals. */
const PRICE_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

const optionalPattern = (max: number, label: string, pattern: RegExp, message: string) =>
  optionalText(max, label).refine((value) => !value || pattern.test(value), message);

const wholeNumber = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}`)
    .refine(
      (value) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max,
      `Enter a whole number from ${min} to ${max.toLocaleString()}`,
    );

export const planFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Enter the plan name')
      .max(PLAN_LIMITS.title, `Name must be at most ${PLAN_LIMITS.title} characters`),
    slug: optionalPattern(
      PLAN_LIMITS.slug,
      'Slug',
      SLUG_PATTERN,
      'Use lowercase letters and digits separated by hyphens',
    ),
    description: optionalText(PLAN_LIMITS.description, 'Description'),
    icon: optionalPattern(
      PLAN_LIMITS.icon,
      'Icon',
      ICON_PATTERN,
      'Use an icon name such as "crown" (letters, digits, _ . : -)',
    ),
    photo: optionalPattern(
      PLAN_LIMITS.photo,
      'Photo',
      PHOTO_PATTERN,
      'Enter an https:// URL or a storage key',
    ),
    price: z
      .string()
      .trim()
      .min(1, 'Enter the price')
      .refine(
        (value) => PRICE_PATTERN.test(value),
        'Enter a price of 0 or more with up to 2 decimals',
      ),
    currency: z
      .string()
      .trim()
      .refine((value) => CURRENCY_PATTERN.test(value), 'Enter a 3-letter currency code, e.g. INR'),
    billingInterval: z.enum(BILLING_INTERVALS),
    billingIntervalCount: wholeNumber(1, PLAN_LIMITS.maxBillingIntervalCount, 'billing period'),
    unlimitedProperties: z.boolean(),
    noOfProperties: z.string().trim(),
    noOfTeamMembers: wholeNumber(0, PLAN_LIMITS.maxTeamMembers, 'number of team members'),
    trialDays: wholeNumber(0, PLAN_LIMITS.maxTrialDays, 'trial days'),
    sortOrder: wholeNumber(0, PLAN_LIMITS.maxSortOrder, 'display order'),
    features: z
      .array(
        z.object({
          value: z
            .string()
            .trim()
            .min(1, 'Enter the feature or remove it')
            .max(PLAN_LIMITS.feature, `At most ${PLAN_LIMITS.feature} characters`),
        }),
      )
      .max(PLAN_LIMITS.maxFeatures, `At most ${PLAN_LIMITS.maxFeatures} features`),
    status: z.enum(PLAN_STATUSES),
    popular: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.billingInterval === 'lifetime' && values.billingIntervalCount !== '1') {
      ctx.addIssue({
        code: 'custom',
        path: ['billingIntervalCount'],
        message: 'Lifetime plans are charged once (period 1)',
      });
    }
    if (!values.unlimitedProperties) {
      const limit = values.noOfProperties;
      if (!/^\d+$/.test(limit) || Number(limit) > PLAN_LIMITS.maxProperties) {
        ctx.addIssue({
          code: 'custom',
          path: ['noOfProperties'],
          message: `Enter a whole number from 0 to ${PLAN_LIMITS.maxProperties.toLocaleString()}, or choose unlimited`,
        });
      }
    }
    // Same rule as the backend: trimmed, compared ignoring case.
    const seen = new Map<string, number>();
    values.features.forEach((feature, index) => {
      const key = feature.value.trim().toLowerCase();
      if (!key) return;
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['features', index, 'value'],
          message: 'This feature is already listed',
        });
      } else {
        seen.set(key, index);
      }
    });
  });

export type PlanFormValues = z.infer<typeof planFormSchema>;
