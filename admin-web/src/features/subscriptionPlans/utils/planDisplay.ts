import { formatNumber } from '@/utils/formatters';

import type {
  BillingInterval,
  PlanStatus,
  SubscriptionPlan,
} from '../types/subscriptionPlan.types';

export const PLAN_STATUS_META: Record<
  PlanStatus,
  { label: string; color: 'success' | 'warning' | 'error'; description: string }
> = {
  active: {
    label: 'Active',
    color: 'success',
    description: 'Offered to users for new subscriptions.',
  },
  draft: {
    label: 'Draft',
    color: 'warning',
    description: 'Being prepared; not offered to users yet.',
  },
  inactive: {
    label: 'Inactive',
    color: 'error',
    description: 'Retired; no new subscriptions. Existing subscribers keep their terms.',
  },
};

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  month: 'Month',
  year: 'Year',
  lifetime: 'Lifetime (one-time)',
};

const NAMED_CYCLES: Record<string, string> = {
  'month:1': 'Monthly',
  'month:3': 'Quarterly',
  'month:6': 'Half-yearly',
  'year:1': 'Yearly',
  'lifetime:1': 'One-time',
};

/** "Monthly", "Quarterly", "Every 2 years", "One-time". */
export function billingCycleLabel(interval: BillingInterval, count: number): string {
  const named = NAMED_CYCLES[`${interval}:${count}`];
  if (named) return named;
  if (interval === 'lifetime') return 'One-time';
  return `Every ${count} ${interval}s`;
}

/** Short period suffix for a price: "/mo", "/3 mo", "/yr", "" for lifetime. */
export function periodSuffix(interval: BillingInterval, count: number): string {
  if (interval === 'lifetime') return '';
  const unit = interval === 'month' ? 'mo' : 'yr';
  return count === 1 ? `/${unit}` : `/${count} ${unit}`;
}

/** The fields that decide what a user is charged. */
export type PlanPricing = Pick<
  SubscriptionPlan,
  'price' | 'currency' | 'billingInterval' | 'billingIntervalCount'
>;

/** Locale currency format; falls back to "INR 999.00" for codes the browser does not know. */
export function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

export function planPriceLabel(plan: PlanPricing): string {
  if (plan.price === 0) return 'Free';
  return `${formatPrice(plan.price, plan.currency)}${periodSuffix(plan.billingInterval, plan.billingIntervalCount)}`;
}

/** Plan period in months (lifetime = null), for comparisons and per-month prices. */
export function periodMonths(plan: PlanPricing): number | null {
  if (plan.billingInterval === 'lifetime') return null;
  return plan.billingInterval === 'month'
    ? plan.billingIntervalCount
    : plan.billingIntervalCount * 12;
}

/** Effective monthly price of a recurring paid plan, or null when it does not apply. */
export function monthlyEquivalent(plan: PlanPricing): string | null {
  const months = periodMonths(plan);
  if (!months || months === 1 || plan.price === 0) return null;
  return `${formatPrice(Math.round((plan.price / months) * 100) / 100, plan.currency)}/mo`;
}

export function propertyLimitLabel(limit: number | null): string {
  if (limit === null) return 'Unlimited';
  return formatNumber(limit);
}

export function teamLimitLabel(limit: number): string {
  return limit === 0 ? 'Not included' : formatNumber(limit);
}

export function trialLabel(days: number): string {
  if (days === 0) return 'No trial';
  return `${days} day${days === 1 ? '' : 's'}`;
}
