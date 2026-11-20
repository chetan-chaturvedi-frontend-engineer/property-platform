import { http, HttpResponse } from 'msw';

import {
  BILLING_INTERVALS,
  PLAN_SORT_FIELDS,
  PLAN_STATUSES,
  type SubscriptionPlan,
} from '@/features/subscriptionPlans/types/subscriptionPlan.types';
import type { PageResponse } from '@/types/api.types';

import { mockDb } from '../mocks/mockDb';

import { apiPath, csrfRejection, problem } from './problem';

/** Mirrors `backend/docs/api/subscription-plans.md` and `SubscriptionPlanService`. */

const BASE = '/admin/subscription-plans';
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ICON = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;
const PHOTO = /^(https:\/\/\S+|(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9/_.-]*)$/;
const KNOWN_CURRENCIES = new Set(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD']);

type Body = Record<string, unknown>;
type Authorized = { error: Response } | { ok: true };

function authorize(request: Request, required: string, write = false): Authorized {
  if (write) {
    const rejected = csrfRejection(request, mockDb.csrfToken());
    if (rejected) return { error: rejected };
  }
  const user = mockDb.sessionUser();
  if (!user) return { error: problem(401, 'unauthorized', 'Authentication required.') };
  if (![required, 'ADMIN_PANEL_ACCESS'].every((p) => user.permissions.includes(p))) {
    return { error: problem(403, 'access_denied', 'Access denied.') };
  }
  return { ok: true };
}

const notFound = () => problem(404, 'subscription_plan_not_found', 'Subscription plan not found.');
const slugTaken = () =>
  problem(409, 'subscription_plan_slug_taken', 'Another subscription plan already uses this slug.');
const invalid = (errors: Record<string, string>) =>
  problem(400, 'validation_failed', 'Validation failed', { errors });

const slugInUse = (slug: string, exceptId?: number) =>
  mockDb.subscriptionPlans().some((plan) => plan.slug === slug && plan.id !== exceptId);

function generateSlug(title: string): string | null {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 110) || 'plan';
  if (!slugInUse(base)) return base;
  for (let n = 2; n < 52; n++) {
    if (!slugInUse(`${base}-${n}`)) return `${base}-${n}`;
  }
  return null;
}

const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/**
 * Applies the given fields to `plan` with the request DTO's rules. `null` clears the clearable
 * fields and is rejected for the others (PATCH); returns field errors.
 */
function applyFields(plan: SubscriptionPlan, body: Body): Record<string, string> {
  const errors: Record<string, string> = {};
  const clearable = (key: 'icon' | 'photo' | 'description', max: number, pattern?: RegExp) => {
    if (!(key in body)) return;
    const value = body[key];
    if (value === null) plan[key] = null;
    else if (typeof value !== 'string' || value.length > max)
      errors[key] = `size must be at most ${max}`;
    else if (pattern && !pattern.test(value)) errors[key] = 'has an invalid format';
    else plan[key] = value;
  };
  clearable('icon', 100, ICON);
  clearable('photo', 2048, PHOTO);
  clearable('description', 5000);

  if ('title' in body) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) errors.title = 'must not be blank';
    else if (title.length > 100) errors.title = 'size must be between 0 and 100';
    else plan.title = title;
  }
  if ('slug' in body) {
    if (typeof body.slug !== 'string' || !SLUG.test(body.slug)) {
      errors.slug = 'must be lowercase letters and digits separated by hyphens';
    } else plan.slug = body.slug;
  }
  if ('price' in body) {
    const price = body.price;
    if (typeof price !== 'number' || price < 0 || Math.round(price * 100) !== price * 100) {
      errors.price = 'must be greater than or equal to 0.00';
    } else plan.price = price;
  }
  if ('currency' in body) {
    if (typeof body.currency !== 'string' || !/^[A-Z]{3}$/.test(body.currency)) {
      errors.currency = 'must be a 3-letter ISO 4217 code';
    } else if (!KNOWN_CURRENCIES.has(body.currency)) {
      errors.currency = 'must be a valid ISO 4217 currency code';
    } else plan.currency = body.currency;
  }
  if ('billingInterval' in body) {
    const interval = BILLING_INTERVALS.find((value) => value === body.billingInterval);
    if (!interval) errors.billingInterval = 'must be month, year or lifetime';
    else plan.billingInterval = interval;
  }
  const ints = [
    ['billingIntervalCount', 1, 36],
    ['noOfTeamMembers', 0, 10_000],
    ['sortOrder', 0, 100_000],
    ['trialDays', 0, 365],
  ] as const;
  for (const [key, min, max] of ints) {
    if (!(key in body)) continue;
    const value = body[key];
    if (!isInt(value, min, max)) errors[key] = `must be between ${min} and ${max}`;
    else plan[key] = value;
  }
  if ('noOfProperties' in body) {
    const value = body.noOfProperties;
    if (value === null) plan.noOfProperties = null;
    else if (!isInt(value, 0, 1_000_000)) errors.noOfProperties = 'must be between 0 and 1000000';
    else plan.noOfProperties = value;
  }
  if ('features' in body) {
    const features = body.features;
    if (!Array.isArray(features) || features.length > 50) {
      errors.features = 'size must be between 0 and 50';
    } else {
      const trimmed = features.map((value) => (typeof value === 'string' ? value.trim() : ''));
      const blank = trimmed.findIndex((value) => !value || value.length > 200);
      const lower = trimmed.map((value) => value.toLowerCase());
      if (blank >= 0) errors[`features[${blank}]`] = 'must not be blank';
      else if (new Set(lower).size !== lower.length)
        errors.features = 'must not contain duplicates';
      else plan.features = trimmed;
    }
  }
  if ('status' in body) {
    const status = PLAN_STATUSES.find((value) => value === body.status);
    if (!status) errors.status = 'must be draft, active or inactive';
    else plan.status = status;
  }
  if ('popular' in body) {
    if (typeof body.popular !== 'boolean') errors.popular = 'must not be null';
    else plan.popular = body.popular;
  }
  if (
    !errors.billingIntervalCount &&
    plan.billingInterval === 'lifetime' &&
    plan.billingIntervalCount !== 1
  ) {
    errors.billingIntervalCount = 'must be 1 for lifetime plans';
  }
  return errors;
}

function matches(plan: SubscriptionPlan, params: URLSearchParams): boolean {
  const search = params.get('search')?.trim().toLowerCase();
  if (search && !plan.title.toLowerCase().includes(search) && !plan.slug.includes(search)) {
    return false;
  }
  const status = params.get('status');
  if (status && plan.status !== status) return false;
  const interval = params.get('billingInterval');
  if (interval && plan.billingInterval !== interval) return false;
  const popular = params.get('popular');
  if (popular && String(plan.popular) !== popular) return false;
  const min = params.get('minPrice');
  if (min && plan.price < Number(min)) return false;
  const max = params.get('maxPrice');
  if (max && plan.price > Number(max)) return false;
  const from = params.get('createdFrom');
  if (from && plan.createdAt < new Date(from).toISOString()) return false;
  const to = params.get('createdTo');
  if (to && plan.createdAt > new Date(to).toISOString()) return false;
  return true;
}

type SortField = (typeof PLAN_SORT_FIELDS)[number];

function sortPlans(rows: SubscriptionPlan[], sort: string | null): SubscriptionPlan[] | null {
  // Backend default: sortOrder asc, then newest; always id desc as the last tiebreaker.
  const orders: Array<[SortField, 'asc' | 'desc']> = sort
    ? []
    : [
        ['sortOrder', 'asc'],
        ['createdAt', 'desc'],
      ];
  if (sort) {
    const [field, direction = 'asc'] = sort.split(',');
    const known = PLAN_SORT_FIELDS.find((value) => value === field);
    if (!known) return null;
    orders.push([known, direction === 'desc' ? 'desc' : 'asc']);
  }
  return [...rows].sort((a, b) => {
    for (const [field, direction] of orders) {
      const left = a[field];
      const right = b[field];
      if (left !== right) return (left < right ? -1 : 1) * (direction === 'asc' ? 1 : -1);
    }
    return b.id - a.id;
  });
}

const idOf = (value: unknown) => Number(value);

export const subscriptionPlanHandlers = [
  http.get(apiPath(BASE), ({ request }) => {
    const auth = authorize(request, 'SUBSCRIPTION_PLAN_LIST');
    if ('error' in auth) return auth.error;
    const params = new URL(request.url).searchParams;
    const min = params.get('minPrice');
    const max = params.get('maxPrice');
    if (min && max && Number(max) < Number(min)) {
      return invalid({ maxPrice: 'must not be less than minPrice' });
    }
    const sorted = sortPlans(
      mockDb.subscriptionPlans().filter((plan) => matches(plan, params)),
      params.get('sort'),
    );
    if (!sorted) {
      return invalid({ sort: `must be one of ${PLAN_SORT_FIELDS.join(', ')}` });
    }
    const page = Number(params.get('page') ?? 0);
    const size = Math.min(Number(params.get('size') ?? 20), 100);
    const body: PageResponse<SubscriptionPlan> = {
      content: sorted.slice(page * size, page * size + size),
      page,
      size,
      totalElements: sorted.length,
      totalPages: Math.ceil(sorted.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const auth = authorize(request, 'SUBSCRIPTION_PLAN_VIEW');
    if ('error' in auth) return auth.error;
    const plan = mockDb.findSubscriptionPlan(idOf(params.id));
    return plan ? HttpResponse.json(plan) : notFound();
  }),

  http.post(apiPath(BASE), async ({ request }) => {
    const auth = authorize(request, 'SUBSCRIPTION_PLAN_CREATE', true);
    if ('error' in auth) return auth.error;
    const body = (await request.json()) as Body;
    const now = new Date().toISOString();
    const plan: SubscriptionPlan = {
      id: 0,
      icon: null,
      photo: null,
      title: '',
      slug: '',
      price: 0,
      currency: 'INR',
      billingInterval: 'month',
      billingIntervalCount: 1,
      description: null,
      noOfProperties: null,
      noOfTeamMembers: 0,
      features: [],
      status: 'draft',
      popular: false,
      sortOrder: 0,
      trialDays: 0,
      createdAt: now,
      updatedAt: now,
    };
    const errors = applyFields(plan, body);
    if (!('title' in body)) errors.title = 'must not be blank';
    if (!('price' in body)) errors.price = 'must not be null';
    if (Object.keys(errors).length > 0) return invalid(errors);
    if (typeof body.slug === 'string') {
      if (slugInUse(body.slug)) return slugTaken();
    } else {
      const slug = generateSlug(plan.title);
      if (!slug) return slugTaken();
      plan.slug = slug;
    }
    const saved = { ...plan, id: mockDb.nextSubscriptionPlanId() };
    mockDb.saveSubscriptionPlan(saved);
    return HttpResponse.json(saved, { status: 201 });
  }),

  http.patch(apiPath(`${BASE}/:id/status`), async ({ request, params }) => {
    const auth = authorize(request, 'SUBSCRIPTION_PLAN_CHANGE_STATUS', true);
    if ('error' in auth) return auth.error;
    const current = mockDb.findSubscriptionPlan(idOf(params.id));
    if (!current) return notFound();
    const body = (await request.json()) as Body;
    const status = PLAN_STATUSES.find((value) => value === body.status);
    if (!status) return invalid({ status: 'must be draft, active or inactive' });
    const saved = { ...current, status, updatedAt: new Date().toISOString() };
    mockDb.saveSubscriptionPlan(saved);
    return HttpResponse.json(saved);
  }),

  http.patch(apiPath(`${BASE}/:id`), async ({ request, params }) => {
    const auth = authorize(request, 'SUBSCRIPTION_PLAN_UPDATE', true);
    if ('error' in auth) return auth.error;
    const current = mockDb.findSubscriptionPlan(idOf(params.id));
    if (!current) return notFound();
    const body = (await request.json()) as Body;
    const plan = { ...current, features: [...current.features] };
    const errors = applyFields(plan, body);
    if (Object.keys(errors).length > 0) return invalid(errors);
    if (typeof body.slug === 'string' && slugInUse(body.slug, plan.id)) return slugTaken();
    const saved = { ...plan, updatedAt: new Date().toISOString() };
    mockDb.saveSubscriptionPlan(saved);
    return HttpResponse.json(saved);
  }),
];
