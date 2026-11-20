import { buildSubscriptionPlans } from '@/tests/mocks/subscriptionPlanMockData';

import { planFormSchema } from '../schemas/planSchema';
import type { SubscriptionPlan } from '../types/subscriptionPlan.types';

import { toPlanCsv } from './planCsv';
import {
  billingCycleLabel,
  monthlyEquivalent,
  planPriceLabel,
  propertyLimitLabel,
  teamLimitLabel,
} from './planDisplay';
import { activeFilterChips, EMPTY_PLAN_PANEL } from './planFilters';
import {
  duplicateFormValues,
  emptyPlanForm,
  toCreateRequest,
  toPlanFormValues,
  toUpdateRequest,
} from './planForm';

function plan(id: number): SubscriptionPlan {
  const found = buildSubscriptionPlans().find((row) => row.id === id);
  if (!found) throw new Error(`no plan ${id}`);
  return found;
}

describe('plan display', () => {
  it('names billing cycles', () => {
    expect(billingCycleLabel('month', 1)).toBe('Monthly');
    expect(billingCycleLabel('month', 3)).toBe('Quarterly');
    expect(billingCycleLabel('month', 6)).toBe('Half-yearly');
    expect(billingCycleLabel('year', 1)).toBe('Yearly');
    expect(billingCycleLabel('year', 2)).toBe('Every 2 years');
    expect(billingCycleLabel('lifetime', 1)).toBe('One-time');
  });

  it('formats prices, monthly equivalents and limits', () => {
    expect(planPriceLabel(plan(1))).toBe('Free');
    expect(planPriceLabel(plan(3))).toMatch(/1,299\/3 mo$/);
    expect(planPriceLabel(plan(8))).not.toContain('/');
    expect(monthlyEquivalent(plan(3))).toMatch(/433\/mo$/);
    expect(monthlyEquivalent(plan(2))).toBeNull();
    expect(propertyLimitLabel(null)).toBe('Unlimited');
    expect(teamLimitLabel(0)).toBe('Not included');
  });
});

describe('plan form', () => {
  it('validates required fields, price format and the lifetime period', () => {
    const empty = planFormSchema.safeParse(emptyPlanForm());
    expect(empty.success).toBe(false);
    const paths = empty.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['title', 'price', 'noOfProperties']));

    const lifetime = planFormSchema.safeParse({
      ...emptyPlanForm(),
      title: 'Pass',
      price: '10.555',
      billingInterval: 'lifetime',
      billingIntervalCount: '2',
      unlimitedProperties: true,
    });
    const lifetimePaths = lifetime.error?.issues.map((issue) => issue.path.join('.'));
    expect(lifetimePaths).toEqual(expect.arrayContaining(['price', 'billingIntervalCount']));
  });

  it('rejects duplicate features ignoring case', () => {
    const result = planFormSchema.safeParse({
      ...toPlanFormValues(plan(4)),
      features: [{ value: 'Analytics' }, { value: ' analytics ' }],
    });
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['features.1.value']);
  });

  it('builds a create request without empty optional fields', () => {
    const request = toCreateRequest({
      ...emptyPlanForm(),
      title: ' Gold ',
      price: '999.5',
      noOfProperties: '10',
      features: [{ value: ' Badge ' }],
    });
    expect(request).toEqual({
      title: 'Gold',
      price: 999.5,
      currency: 'INR',
      billingInterval: 'month',
      billingIntervalCount: 1,
      noOfProperties: 10,
      noOfTeamMembers: 0,
      trialDays: 0,
      sortOrder: 0,
      features: ['Badge'],
      status: 'draft',
      popular: false,
    });
  });

  it('sends only changed fields on update, with null for cleared ones', () => {
    const gold = plan(4);
    expect(toUpdateRequest(gold, toPlanFormValues(gold))).toEqual({});
    expect(
      toUpdateRequest(gold, {
        ...toPlanFormValues(gold),
        description: '',
        unlimitedProperties: true,
        price: '2599',
      }),
    ).toEqual({ description: null, noOfProperties: null, price: 2599 });
  });

  it('duplicates as an unpopular draft without a slug', () => {
    const values = duplicateFormValues(plan(4));
    expect(values).toMatchObject({
      title: 'Copy of Gold',
      slug: '',
      status: 'draft',
      popular: false,
    });
    expect(values.features).toEqual(toPlanFormValues(plan(4)).features);
  });
});

describe('plan filters and CSV', () => {
  it('describes applied filters as removable chips', () => {
    const removed: string[][] = [];
    const chips = activeFilterChips(
      { ...EMPTY_PLAN_PANEL, billingInterval: 'year', minPrice: '100', createdTo: '2026-11-01' },
      (keys) => removed.push(keys),
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      'Billing: Year',
      'Price ≥ 100',
      'Created until 2026-11-01',
    ]);
    chips[1]?.onRemove();
    expect(removed).toEqual([['min', 'max']]);
  });

  it('exports plans with a header row and formula-safe cells', () => {
    const csv = toPlanCsv([{ ...plan(4), features: ['=cmd', 'Badge'] }]);
    const [header, row] = csv.replace('﻿', '').split('\r\n');
    expect(header?.startsWith('ID,Name,Slug,Status,Price,Currency,Billing cycle')).toBe(true);
    expect(row).toContain('4,Gold,gold,Active,2499.00,INR,Monthly');
    expect(row).toContain("'=cmd; Badge");
  });
});
