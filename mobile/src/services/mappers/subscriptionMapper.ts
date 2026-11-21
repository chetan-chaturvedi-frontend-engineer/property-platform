import { MySubscription, SubscriptionPlan } from '../../types';
import { ApiSubscriptionPlan, ApiUserSubscription } from '../../types/api';
import { formatIndianNumber } from '../../utils/format';

const CURRENCY: Record<string, string> = { INR: '₹', USD: '$', EUR: '€' };

function periodLabel(plan: ApiSubscriptionPlan): string {
  if (plan.billingInterval === 'lifetime') {
    return 'one time';
  }
  const unit = plan.billingInterval === 'month' ? 'month' : 'year';
  return plan.billingIntervalCount === 1 ? unit : `${plan.billingIntervalCount} ${unit}s`;
}

export function toPlan(p: ApiSubscriptionPlan): SubscriptionPlan {
  const symbol = CURRENCY[p.currency] ?? `${p.currency} `;
  return {
    id: p.id,
    title: p.title,
    priceLabel: p.price === 0 ? 'Free' : `${symbol}${formatIndianNumber(p.price)} / ${periodLabel(p)}`,
    description: p.description ?? '',
    features: p.features,
    limitLabel: p.noOfProperties === null ? 'Unlimited properties' : `Up to ${p.noOfProperties} ${p.noOfProperties === 1 ? 'property' : 'properties'}`,
    popular: p.popular,
  };
}

export function toMySubscription(s: ApiUserSubscription): MySubscription {
  return { planTitle: s.planTitle, propertyLimit: s.noOfProperties, endsAt: s.endsAt };
}
