import type { Nullable } from '@/types/common.types';
import { humanizeCode } from '@/utils/formatters';

import type {
  AreaUnit,
  Facing,
  Furnishing,
  LeadPriority,
  LeadPropertyType,
  LeadPurpose,
  LeadSource,
  LeadStatus,
  ParkingPreference,
  PossessionTimeline,
} from '../types/lead.types';

export type ChipColor = 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary';

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; color: ChipColor }> = {
  new: { label: 'New', color: 'info' },
  contacted: { label: 'Contacted', color: 'secondary' },
  interested: { label: 'Interested', color: 'secondary' },
  qualified: { label: 'Qualified', color: 'secondary' },
  site_visit_scheduled: { label: 'Site visit scheduled', color: 'warning' },
  negotiation: { label: 'Negotiation', color: 'warning' },
  converted: { label: 'Converted', color: 'success' },
  lost: { label: 'Lost', color: 'error' },
  on_hold: { label: 'On hold', color: 'default' },
};

/** Statuses between first contact and the outcome, counted together as "in progress". */
export const IN_PROGRESS_STATUSES: readonly LeadStatus[] = [
  'contacted',
  'interested',
  'qualified',
  'site_visit_scheduled',
  'negotiation',
];

export const LEAD_PRIORITY_META: Record<LeadPriority, { label: string; color: ChipColor }> = {
  low: { label: 'Low', color: 'default' },
  medium: { label: 'Medium', color: 'info' },
  high: { label: 'High', color: 'warning' },
  urgent: { label: 'Urgent', color: 'error' },
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  referral: 'Referral',
  walk_in: 'Walk-in',
  phone_call: 'Phone call',
  other: 'Other',
};

export const LEAD_PURPOSE_LABELS: Record<LeadPurpose, string> = {
  buy: 'Buy',
  rent: 'Rent',
  lease: 'Lease',
  sell: 'Sell',
};

export const LEAD_PROPERTY_TYPE_LABELS: Record<LeadPropertyType, string> = {
  apartment: 'Apartment',
  flat: 'Flat',
  villa: 'Villa',
  independent_house: 'Independent house',
  plot: 'Plot',
  commercial: 'Commercial',
  office: 'Office',
  shop: 'Shop',
  other: 'Other',
};

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  sq_ft: 'sq.ft.',
  sq_m: 'sq.m.',
  acre: 'acre',
  hectare: 'hectare',
};

export const POSSESSION_LABELS: Record<PossessionTimeline, string> = {
  ready_to_move: 'Ready to move',
  within_3_months: 'Within 3 months',
  within_6_months: 'Within 6 months',
  within_1_year: 'Within 1 year',
  after_1_year: 'After 1 year',
  flexible: 'Flexible',
};

export const FACING_LABELS: Record<Facing, string> = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
  north_east: 'North-east',
  north_west: 'North-west',
  south_east: 'South-east',
  south_west: 'South-west',
};

export const FURNISHING_LABELS: Record<Furnishing, string> = {
  furnished: 'Furnished',
  semi_furnished: 'Semi-furnished',
  unfurnished: 'Unfurnished',
};

export const PARKING_LABELS: Record<ParkingPreference, string> = {
  not_required: 'Not required',
  two_wheeler: 'Two-wheeler',
  four_wheeler: 'Four-wheeler',
  both: 'Two- and four-wheeler',
};

/** Offered BHK values; the backend accepts studio, 1rk or 1-99 bedrooms with an optional .5. */
export const BHK_OPTIONS = ['studio', '1rk', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6'];

export function bhkLabel(bhk: Nullable<string>): string {
  if (!bhk) return '—';
  if (bhk === 'studio') return 'Studio';
  if (bhk === '1rk') return '1 RK';
  return `${bhk} BHK`;
}

/** A lead's display name for a user reference; deleted accounts have no name. */
export function userName(user: Nullable<{ fullName: Nullable<string> }>, fallback = '—'): string {
  if (!user) return fallback;
  return user.fullName ?? 'Deleted user';
}

const compactFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string): Intl.NumberFormat | null {
  const cached = compactFormatters.get(currency);
  if (cached) return cached;
  try {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 2,
    });
    compactFormatters.set(currency, formatter);
    return formatter;
  } catch {
    return null;
  }
}

export function formatMoney(value: number, currency: string): string {
  return moneyFormatter(currency)?.format(value) ?? `${currency} ${value}`;
}

/** "₹45L – ₹60L", one bound, or "—". */
export function formatBudget(
  min: Nullable<number>,
  max: Nullable<number>,
  currency: string,
): string {
  if (min == null && max == null) return '—';
  if (min != null && max != null) {
    return min === max
      ? formatMoney(min, currency)
      : `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
  }
  return min != null
    ? `From ${formatMoney(min, currency)}`
    : `Up to ${formatMoney(max ?? 0, currency)}`;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** A `yyyy-MM-dd` date, shown without time-zone shifts. */
export function formatLocalDate(value: Nullable<string>): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '—';
  return dateFormatter.format(new Date(year, month - 1, day));
}

/** API instant -> `datetime-local` input value in the viewer's time zone. */
export function toLocalInput(value: Nullable<string>): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** `datetime-local` input value -> ISO instant, or null when empty. */
export function fromLocalInput(value: string): Nullable<string> {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Start / end of a local calendar day as an ISO instant (the API filters on instants). */
export function dayStart(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}
export function dayEnd(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

/** Label for an enum value without a dedicated map entry (e.g. an unknown amenity slug). */
export function slugLabel(slug: string): string {
  return humanizeCode(slug);
}

export function parseLeadId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Share of a total as "37.5%", or "0%" when the total is 0. */
export function formatShare(count: number, total: number): string {
  if (total <= 0) return '0%';
  const share = (count / total) * 100;
  return `${share >= 10 || share === 0 ? share.toFixed(0) : share.toFixed(1)}%`;
}
