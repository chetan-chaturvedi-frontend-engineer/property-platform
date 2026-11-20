import { type CsvColumn, toCsv } from '@/utils/csv';

import type { SubscriptionPlan } from '../types/subscriptionPlan.types';

import { billingCycleLabel, PLAN_STATUS_META } from './planDisplay';

const COLUMNS: readonly CsvColumn<SubscriptionPlan>[] = [
  ['ID', (p) => String(p.id)],
  ['Name', (p) => p.title],
  ['Slug', (p) => p.slug],
  ['Status', (p) => PLAN_STATUS_META[p.status].label],
  ['Price', (p) => p.price.toFixed(2)],
  ['Currency', (p) => p.currency],
  ['Billing cycle', (p) => billingCycleLabel(p.billingInterval, p.billingIntervalCount)],
  ['Billing interval', (p) => p.billingInterval],
  ['Interval count', (p) => String(p.billingIntervalCount)],
  ['Trial days', (p) => String(p.trialDays)],
  ['Property limit', (p) => (p.noOfProperties === null ? 'Unlimited' : String(p.noOfProperties))],
  ['Team members', (p) => String(p.noOfTeamMembers)],
  ['Popular', (p) => (p.popular ? 'Yes' : 'No')],
  ['Display order', (p) => String(p.sortOrder)],
  ['Features', (p) => p.features.join('; ')],
  ['Description', (p) => p.description ?? ''],
  ['Created (UTC)', (p) => p.createdAt],
  ['Updated (UTC)', (p) => p.updatedAt],
];

export function toPlanCsv(plans: readonly SubscriptionPlan[]): string {
  return toCsv(COLUMNS, plans);
}
