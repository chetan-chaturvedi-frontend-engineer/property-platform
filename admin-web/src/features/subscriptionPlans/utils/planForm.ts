import type { Path } from 'react-hook-form';

import { PLAN_LIMITS, type PlanFormValues } from '../schemas/planSchema';
import type {
  CreatePlanRequest,
  SubscriptionPlan,
  UpdatePlanRequest,
} from '../types/subscriptionPlan.types';

/** Backend default (`SubscriptionPlan.DEFAULT_CURRENCY`). */
export const DEFAULT_CURRENCY = 'INR';

/** Form fields whose names match the API's field-error keys. */
export const PLAN_FORM_FIELDS: readonly Path<PlanFormValues>[] = [
  'title',
  'slug',
  'description',
  'icon',
  'photo',
  'price',
  'currency',
  'billingInterval',
  'billingIntervalCount',
  'noOfProperties',
  'noOfTeamMembers',
  'trialDays',
  'sortOrder',
  'features',
  'status',
  'popular',
];

export function emptyPlanForm(): PlanFormValues {
  return {
    title: '',
    slug: '',
    description: '',
    icon: '',
    photo: '',
    price: '',
    currency: DEFAULT_CURRENCY,
    billingInterval: 'month',
    billingIntervalCount: '1',
    unlimitedProperties: false,
    noOfProperties: '',
    noOfTeamMembers: '0',
    trialDays: '0',
    sortOrder: '0',
    features: [],
    status: 'draft',
    popular: false,
  };
}

export function toPlanFormValues(plan: SubscriptionPlan): PlanFormValues {
  return {
    title: plan.title,
    slug: plan.slug,
    description: plan.description ?? '',
    icon: plan.icon ?? '',
    photo: plan.photo ?? '',
    price: String(plan.price),
    currency: plan.currency,
    billingInterval: plan.billingInterval,
    billingIntervalCount: String(plan.billingIntervalCount),
    unlimitedProperties: plan.noOfProperties === null,
    noOfProperties: plan.noOfProperties === null ? '' : String(plan.noOfProperties),
    noOfTeamMembers: String(plan.noOfTeamMembers),
    trialDays: String(plan.trialDays),
    sortOrder: String(plan.sortOrder),
    features: plan.features.map((value) => ({ value })),
    status: plan.status,
    popular: plan.popular,
  };
}

/** The full set of values a form describes, in API types. Empty optional text = null. */
function toPlanValues(values: PlanFormValues) {
  const text = (value: string) => value.trim() || null;
  return {
    title: values.title.trim(),
    slug: text(values.slug),
    description: text(values.description),
    icon: text(values.icon),
    photo: text(values.photo),
    price: Number(values.price),
    currency: values.currency.trim(),
    billingInterval: values.billingInterval,
    billingIntervalCount: Number(values.billingIntervalCount),
    noOfProperties: values.unlimitedProperties ? null : Number(values.noOfProperties),
    noOfTeamMembers: Number(values.noOfTeamMembers),
    trialDays: Number(values.trialDays),
    sortOrder: Number(values.sortOrder),
    features: values.features.map((feature) => feature.value.trim()),
    status: values.status,
    popular: values.popular,
  };
}

/** Omits empty optional text, so the backend applies its defaults (e.g. a slug from the title). */
export function toCreateRequest(values: PlanFormValues): CreatePlanRequest {
  const { slug, description, icon, photo, ...rest } = toPlanValues(values);
  return {
    ...rest,
    ...(slug ? { slug } : {}),
    ...(description ? { description } : {}),
    ...(icon ? { icon } : {}),
    ...(photo ? { photo } : {}),
  };
}

/** Only the fields that changed; cleared optional fields are sent as null. */
export function toUpdateRequest(plan: SubscriptionPlan, values: PlanFormValues): UpdatePlanRequest {
  const next = toPlanValues(values);
  const request: UpdatePlanRequest = {};
  if (next.title !== plan.title) request.title = next.title;
  // A slug cannot be cleared; an emptied field keeps the current one.
  if (next.slug && next.slug !== plan.slug) request.slug = next.slug;
  if (next.description !== plan.description) request.description = next.description;
  if (next.icon !== plan.icon) request.icon = next.icon;
  if (next.photo !== plan.photo) request.photo = next.photo;
  if (next.price !== plan.price) request.price = next.price;
  if (next.currency !== plan.currency) request.currency = next.currency;
  if (next.billingInterval !== plan.billingInterval) request.billingInterval = next.billingInterval;
  if (next.billingIntervalCount !== plan.billingIntervalCount) {
    request.billingIntervalCount = next.billingIntervalCount;
  }
  if (next.noOfProperties !== plan.noOfProperties) request.noOfProperties = next.noOfProperties;
  if (next.noOfTeamMembers !== plan.noOfTeamMembers) request.noOfTeamMembers = next.noOfTeamMembers;
  if (next.trialDays !== plan.trialDays) request.trialDays = next.trialDays;
  if (next.sortOrder !== plan.sortOrder) request.sortOrder = next.sortOrder;
  if (next.features.join('\n') !== plan.features.join('\n')) request.features = next.features;
  if (next.status !== plan.status) request.status = next.status;
  if (next.popular !== plan.popular) request.popular = next.popular;
  return request;
}

const COPY_PREFIX = 'Copy of ';

/**
 * Form values for a copy: the plan's terms as a new draft. The slug is left empty, so the backend
 * generates a unique one from the new name; it is not popular until someone decides so.
 */
export function duplicateFormValues(plan: SubscriptionPlan): PlanFormValues {
  return {
    ...toPlanFormValues(plan),
    title: `${COPY_PREFIX}${plan.title}`.slice(0, PLAN_LIMITS.title),
    slug: '',
    status: 'draft',
    popular: false,
  };
}
