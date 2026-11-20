import type { Nullable } from '@/types/common.types';

import {
  type SiteVisitInterest,
  type SiteVisitStatus,
  type SiteVisitType,
  UPCOMING_STATUSES,
} from '../types/siteVisit.types';

export type ChipColor =
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export const SITE_VISIT_STATUS_META: Record<
  SiteVisitStatus,
  { label: string; color: Exclude<ChipColor, 'default'> }
> = {
  scheduled: { label: 'Scheduled', color: 'info' },
  confirmed: { label: 'Confirmed', color: 'primary' },
  rescheduled: { label: 'Rescheduled', color: 'secondary' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
  no_show: { label: 'No show', color: 'warning' },
};

export const SITE_VISIT_TYPE_LABELS: Record<SiteVisitType, string> = {
  site_visit: 'Site visit',
  virtual_visit: 'Virtual visit',
  revisit: 'Revisit',
};

/** Theme colors of the visit-type chart segments. */
export const SITE_VISIT_TYPE_COLORS: Record<SiteVisitType, Exclude<ChipColor, 'default'>> = {
  site_visit: 'primary',
  virtual_visit: 'info',
  revisit: 'secondary',
};

export const SITE_VISIT_INTEREST_META: Record<
  SiteVisitInterest,
  { label: string; color: ChipColor }
> = {
  high: { label: 'High', color: 'success' },
  medium: { label: 'Medium', color: 'info' },
  low: { label: 'Low', color: 'warning' },
  not_interested: { label: 'Not interested', color: 'default' },
};

export function isUpcoming(status: SiteVisitStatus): boolean {
  return UPCOMING_STATUSES.includes(status);
}

/** Final statuses that still allow (re)assignment, per the lifecycle rules. */
export function canBeAssigned(status: SiteVisitStatus): boolean {
  return isUpcoming(status) || status === 'completed';
}

/**
 * Visit dates and times are wall-clock values at the property, in the backend's
 * `app.site-visit.time-zone`. Keep in sync with `application.yml`.
 */
export const SITE_VISIT_TIME_ZONE = 'Asia/Kolkata';
/** `app.site-visit.max-advance-days`. */
export const MAX_ADVANCE_DAYS = 90;

const zoneParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: SITE_VISIT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Now at the property: `{ date: 'yyyy-MM-dd', time: 'HH:mm' }`. */
export function propertyNow(now: Date = new Date()): { date: string; time: string } {
  const parts = Object.fromEntries(zoneParts.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/** Adds days to a `yyyy-MM-dd` date (calendar arithmetic, no time zones involved). */
export function addDays(date: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

/** `HH:mm:ss` or `HH:mm` -> `HH:mm`. */
export function shortTime(time: string): string {
  return time.slice(0, 5);
}

/** The visit's slot has been reached at the property (needed for completed and no-show). */
export function isDue(visitDate: string, visitTime: string, now: Date = new Date()): boolean {
  const current = propertyNow(now);
  return `${visitDate}T${shortTime(visitTime)}` <= `${current.date}T${current.time}`;
}

/**
 * Same rules as the backend for new and moved visits: today or later at the property, within the
 * advance window, and not earlier than now when the date is today. Returns an error or null.
 */
export function scheduleError(
  visitDate: string,
  visitTime: string,
  now: Date = new Date(),
): { field: 'visitDate' | 'visitTime'; message: string } | null {
  const current = propertyNow(now);
  if (visitDate < current.date) {
    return { field: 'visitDate', message: 'The visit date cannot be in the past' };
  }
  if (visitDate > addDays(current.date, MAX_ADVANCE_DAYS)) {
    return {
      field: 'visitDate',
      message: `Visits can be booked at most ${MAX_ADVANCE_DAYS} days ahead`,
    };
  }
  if (visitDate === current.date && visitTime && shortTime(visitTime) < current.time) {
    return { field: 'visitTime', message: 'This time has already passed today' };
  }
  return null;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});

function wallClock(date: string, time = '00:00'): Date | null {
  const value = new Date(`${date}T${shortTime(time)}:00Z`);
  return Number.isNaN(value.getTime()) ? null : value;
}

/** A property-local `yyyy-MM-dd`, shown as is (no time-zone shift). */
export function formatVisitDate(date: Nullable<string>): string {
  if (!date) return '—';
  const value = wallClock(date);
  return value ? dateFormatter.format(value) : '—';
}

/** A property-local `HH:mm(:ss)`, shown as is, e.g. "10:30 AM". */
export function formatVisitTime(time: Nullable<string>): string {
  if (!time) return '—';
  const value = wallClock('2000-01-01', time);
  return value ? timeFormatter.format(value) : '—';
}

/** A user reference's display name; deleted accounts have no name. */
export function userName(user: Nullable<{ fullName: Nullable<string> }>, fallback = '—'): string {
  if (!user) return fallback;
  return user.fullName ?? 'Deleted user';
}

/** "Baner, Pune", or null. */
export function propertyPlace(property: {
  locality: Nullable<string>;
  city: Nullable<string>;
}): string | null {
  return [property.locality, property.city].filter(Boolean).join(', ') || null;
}

/** Share of a total as "37.5%", or "0%" when the total is 0. */
export function formatShare(count: number, total: number): string {
  if (total <= 0) return '0%';
  const share = (count / total) * 100;
  return `${share >= 10 || share === 0 ? share.toFixed(0) : share.toFixed(1)}%`;
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
