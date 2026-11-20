import type {
  BillingInterval,
  PlanStatus,
  SubscriptionPlan,
} from '@/features/subscriptionPlans/types/subscriptionPlan.types';

/**
 * Mock plans for MSW, deterministic so tests can count on them: 14 plans, ids 1-14, sort orders
 * 10, 20, ... 140. Statuses: 8 active, 3 draft, 3 inactive. Popular: Gold (4) and Builder Pro (6).
 * Mock data only.
 */

type Seed = [
  title: string,
  price: number,
  interval: BillingInterval,
  count: number,
  properties: number | null,
  team: number,
  status: PlanStatus,
];

const SEEDS: readonly Seed[] = [
  ['Free', 0, 'month', 1, 1, 0, 'active'],
  ['Starter', 499, 'month', 1, 5, 0, 'active'],
  ['Silver', 1299, 'month', 3, 15, 0, 'active'],
  ['Gold', 2499, 'month', 1, 50, 2, 'active'],
  ['Platinum', 24999, 'year', 1, null, 5, 'active'],
  ['Builder Pro', 4999, 'month', 1, 100, 10, 'active'],
  ['Builder Enterprise', 49999, 'year', 1, null, 50, 'active'],
  ['Lifetime Pass', 99999, 'lifetime', 1, 25, 1, 'active'],
  ['Half-Yearly Plus', 6999, 'month', 6, 30, 3, 'draft'],
  ['Agency', 8999, 'month', 1, 200, 25, 'draft'],
  ['Festive Offer', 999, 'month', 1, 10, 0, 'draft'],
  ['Legacy Basic', 299, 'month', 1, 3, 0, 'inactive'],
  ['Legacy Premium', 1999, 'month', 1, 40, 0, 'inactive'],
  ['Pilot Builder', 2999, 'year', 2, 60, 5, 'inactive'],
];

const BASE_FEATURES = ['Verified listing badge', 'Lead notifications', 'Email support'];
const EXTRA_FEATURES = ['Featured listings', 'Analytics dashboard', 'Priority support'];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildSubscriptionPlans(): SubscriptionPlan[] {
  const start = Date.parse('2026-10-01T09:00:00Z');
  return SEEDS.map(([title, price, interval, count, properties, team, status], index) => {
    const created = new Date(start + index * 86_400_000).toISOString();
    return {
      id: index + 1,
      icon: index % 2 === 0 ? 'crown' : null,
      photo: null,
      title,
      slug: slugify(title),
      price,
      currency: 'INR',
      billingInterval: interval,
      billingIntervalCount: count,
      description: price === 0 ? 'Try the platform with one listing.' : `${title} package.`,
      noOfProperties: properties,
      noOfTeamMembers: team,
      features: [...BASE_FEATURES.slice(0, 1 + (index % 3)), ...EXTRA_FEATURES.slice(0, index % 4)],
      status,
      popular: title === 'Gold' || title === 'Builder Pro',
      sortOrder: (index + 1) * 10,
      trialDays: price === 0 ? 0 : index % 3 === 0 ? 14 : 0,
      createdAt: created,
      updatedAt: created,
    };
  });
}
