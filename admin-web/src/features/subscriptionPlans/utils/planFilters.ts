import type { BillingInterval } from '../types/subscriptionPlan.types';

import { BILLING_INTERVAL_LABELS } from './planDisplay';

/** The filters this panel edits; applied together with "Apply filters". */
export interface PlanPanelFilters {
  billingInterval: BillingInterval | '';
  popular: 'yes' | 'no' | '';
  minPrice: string;
  maxPrice: string;
  /** `yyyy-MM-dd`, inclusive. */
  createdFrom: string;
  createdTo: string;
}

export const EMPTY_PLAN_PANEL: PlanPanelFilters = {
  billingInterval: '',
  popular: '',
  minPrice: '',
  maxPrice: '',
  createdFrom: '',
  createdTo: '',
};

/** Sort choices of the toolbar select (`field,direction`); the column headers cover the rest. */
export const SORT_OPTIONS = [
  { value: 'sortOrder,asc', label: 'Display order' },
  { value: 'title,asc', label: 'Name (A–Z)' },
  { value: 'title,desc', label: 'Name (Z–A)' },
  { value: 'price,asc', label: 'Price (low to high)' },
  { value: 'price,desc', label: 'Price (high to low)' },
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
] as const;

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * The applied panel filters as chips; `remove` receives the URL keys to drop. A range is one chip, so
 * removing it clears both bounds.
 */
export function activeFilterChips(
  applied: PlanPanelFilters,
  remove: (urlKeys: string[]) => void,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (applied.billingInterval) {
    chips.push({
      key: 'interval',
      label: `Billing: ${BILLING_INTERVAL_LABELS[applied.billingInterval]}`,
      onRemove: () => remove(['interval']),
    });
  }
  if (applied.popular) {
    chips.push({
      key: 'popular',
      label: applied.popular === 'yes' ? 'Popular only' : 'Not popular',
      onRemove: () => remove(['popular']),
    });
  }
  if (applied.minPrice || applied.maxPrice) {
    const label =
      applied.minPrice && applied.maxPrice
        ? `Price: ${applied.minPrice} – ${applied.maxPrice}`
        : applied.minPrice
          ? `Price ≥ ${applied.minPrice}`
          : `Price ≤ ${applied.maxPrice}`;
    chips.push({ key: 'price', label, onRemove: () => remove(['min', 'max']) });
  }
  if (applied.createdFrom || applied.createdTo) {
    const label =
      applied.createdFrom && applied.createdTo
        ? `Created: ${applied.createdFrom} – ${applied.createdTo}`
        : applied.createdFrom
          ? `Created from ${applied.createdFrom}`
          : `Created until ${applied.createdTo}`;
    chips.push({ key: 'created', label, onRemove: () => remove(['from', 'to']) });
  }
  return chips;
}
