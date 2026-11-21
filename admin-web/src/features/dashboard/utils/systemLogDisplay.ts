import type { ToolbarOption } from '@/components/common/ListToolbar';
import { humanizeCode } from '@/utils/formatters';

import { SYSTEM_LOG_LEVELS, type SystemLog, type SystemLogLevel } from '../types/systemLog.types';

/** Every order the backend supports (`createdAt` or `id`). */
export const SYSTEM_LOG_SORT_OPTIONS: readonly ToolbarOption[] = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'id,desc', label: 'Log ID (high to low)' },
  { value: 'id,asc', label: 'Log ID (low to high)' },
];

/** Explicit logs of permission denials, CSRF rejections and refused sessions use this module. */
export const DENIED_MODULE = 'permissions';

export const SYSTEM_LOG_LEVEL_META: Record<
  SystemLogLevel,
  { label: string; color: 'info' | 'success' | 'warning'; description: string }
> = {
  info: {
    label: 'Info',
    color: 'info',
    description: 'General activity, including sensitive reads',
  },
  success: { label: 'Success', color: 'success', description: 'A completed operation' },
  warning: {
    label: 'Warning',
    color: 'warning',
    description: 'A failed attempt, access denial or risky operation',
  },
};

export const SYSTEM_LOG_LEVEL_OPTIONS: readonly ToolbarOption[] = SYSTEM_LOG_LEVELS.map(
  (level) => ({ value: level, label: SYSTEM_LOG_LEVEL_META[level].label }),
);

/**
 * Modules the backend writes. There is no module endpoint: explicit logs use `authentication`,
 * `permissions` and `system` (`SystemLogModules`), automatic ones the first API path segment with
 * dashes as underscores (`SystemLogInterceptor`). Add a module here when a controller is added.
 */
const MODULE_LABELS: Record<string, string> = {
  authentication: 'Authentication',
  permissions: 'Access control',
  system: 'System',
  users: 'Users',
  roles: 'Roles & permissions',
  properties: 'Properties',
  leads: 'Leads / Enquiries',
  site_visits: 'Site visits',
  subscription_plans: 'Packages & plans',
  builder_teams: 'Builder teams',
  builder_team_memberships: 'Builder team memberships',
  banners: 'Banners',
  blogs: 'Blogs',
  blog_categories: 'Blog categories',
  faqs: 'FAQs',
  pages: 'Pages',
  user_settings: 'User settings',
  system_logs: 'System logs',
};

export function moduleLabel(module: string): string {
  return MODULE_LABELS[module] ?? humanizeCode(module);
}

export const SYSTEM_LOG_MODULE_OPTIONS: readonly ToolbarOption[] = Object.keys(MODULE_LABELS)
  .map((value) => ({ value, label: moduleLabel(value) }))
  .sort((a, b) => a.label.localeCompare(b.label));

/** Same rule as the backend's `module` filter. */
export const MODULE_PATTERN = /^[a-z0-9_]{1,50}$/;

/** The module options, plus `current` when it came from a link and is not a known module. */
export function moduleOptionsWith(current: string | undefined): readonly ToolbarOption[] {
  if (!current || SYSTEM_LOG_MODULE_OPTIONS.some((option) => option.value === current)) {
    return SYSTEM_LOG_MODULE_OPTIONS;
  }
  return [...SYSTEM_LOG_MODULE_OPTIONS, { value: current, label: moduleLabel(current) }];
}

/** "#LOG-42", as the design shows ids. */
export function formatLogId(id: number): string {
  return `#LOG-${id}`;
}

/** Who acted, for a log without a user: a background job, or a request without a session. */
export function actorLabel(log: Pick<SystemLog, 'user' | 'requestMethod'>): {
  name: string;
  caption: string;
} {
  if (log.user) {
    return {
      name: log.user.fullName,
      caption: log.user.deleted ? 'Deleted account' : humanizeCode(log.user.userType),
    };
  }
  return log.requestMethod
    ? { name: 'Guest', caption: 'Not signed in or account removed' }
    : { name: 'System', caption: 'Background job' };
}

// ---------------------------------------------------------------------------------------------
// Dates. The API takes instants; ranges are whole days in the viewer's time zone.

export const DATE_RANGE_PRESETS = [
  'today',
  'yesterday',
  'last7',
  'last30',
  'thisMonth',
  'lastMonth',
  'custom',
] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7: 'Last 7 days',
  last30: 'Last 30 days',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  custom: 'Custom range',
};

/** The presets offered in a dropdown; a custom range is set with dates. */
export const DATE_RANGE_OPTIONS: readonly ToolbarOption[] = DATE_RANGE_PRESETS.filter(
  (preset) => preset !== 'custom',
).map((preset) => ({ value: preset, label: DATE_RANGE_LABELS[preset] }));

/** Local midnight of `date` moved by `days`. */
function startOfDay(date: Date, days = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfToday(now = new Date()): Date {
  return startOfDay(now);
}

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A `yyyy-MM-dd` value as local midnight, or undefined when it is not a real date. */
export function parseDay(value: string | undefined): Date | undefined {
  const match = value ? DAY_PATTERN.exec(value) : null;
  if (!match) return undefined;
  const [, year, month, day] = match.map(Number);
  if (year === undefined || month === undefined || day === undefined) return undefined;
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

export interface DateRange {
  preset?: DateRangePreset;
  /** `yyyy-MM-dd`, for `custom`. */
  from?: string;
  to?: string;
}

/**
 * The `createdFrom` / `createdTo` instants of a range; both bounds are inclusive. Open-ended ranges
 * (today, last 7 days, ...) have no end, so new activity keeps appearing.
 */
export function rangeToInstants(
  range: DateRange,
  now = new Date(),
): { createdFrom?: string; createdTo?: string } {
  const lastMsBefore = (date: Date) => new Date(date.getTime() - 1).toISOString();
  const today = startOfDay(now);
  switch (range.preset) {
    case 'today':
      return { createdFrom: today.toISOString() };
    case 'yesterday':
      return { createdFrom: startOfDay(now, -1).toISOString(), createdTo: lastMsBefore(today) };
    case 'last7':
      return { createdFrom: startOfDay(now, -6).toISOString() };
    case 'last30':
      return { createdFrom: startOfDay(now, -29).toISOString() };
    case 'thisMonth':
      return { createdFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
    case 'lastMonth':
      return {
        createdFrom: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
        createdTo: lastMsBefore(new Date(now.getFullYear(), now.getMonth(), 1)),
      };
    case 'custom': {
      const from = parseDay(range.from);
      const parsedTo = parseDay(range.to);
      // A hand-edited link with the end before the start keeps only the start.
      const to = from && parsedTo && parsedTo < from ? undefined : parsedTo;
      return {
        createdFrom: from?.toISOString(),
        createdTo: to ? lastMsBefore(startOfDay(to, 1)) : undefined,
      };
    }
    default:
      return {};
  }
}

/** "12 Nov 2026 – 18 Nov 2026" for a custom range, else the preset's label. */
export function rangeLabel(range: DateRange): string | undefined {
  if (!range.preset) return undefined;
  if (range.preset !== 'custom') return DATE_RANGE_LABELS[range.preset];
  const format = (value: string | undefined) => {
    const day = parseDay(value);
    return day ? day.toLocaleDateString(undefined, { dateStyle: 'medium' }) : undefined;
  };
  const from = format(range.from);
  const to = format(range.to);
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  return to ? `Until ${to}` : undefined;
}

// ---------------------------------------------------------------------------------------------
// Search. The API searches the action text; an exact IP address goes to the `ipAddress` filter.

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6 = /^(?=.*:.*:)[0-9a-f:]{2,39}$/i;

export function isIpAddress(value: string): boolean {
  return IPV4.test(value) || (IPV6.test(value) && !value.includes(':::'));
}

/** Backend limit of the `action` keyword. */
export const SEARCH_MAX_LENGTH = 100;

export function searchToFilters(search: string): { action?: string; ipAddress?: string } {
  const term = search.trim();
  if (!term) return {};
  return isIpAddress(term) ? { ipAddress: term } : { action: term.slice(0, SEARCH_MAX_LENGTH) };
}

// ---------------------------------------------------------------------------------------------
// Details.

const SECRET_KEY = /pass(word|wd)?|secret|token|otp|api.?key|authori[sz]ation|credential|cookie/i;
export const MASK = '••••••';

/**
 * A copy of the additional data with credential-like keys masked at any depth. The backend rejects
 * such keys on manual logs; this is a second guard for anything written before or around it.
 */
export function maskSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SECRET_KEY.test(key) ? MASK : maskSensitive(nested),
      ]),
    );
  }
  return value;
}

/** HTTP status the interceptor stores in the additional data, when present. */
export function statusCodeOf(log: Pick<SystemLog, 'additionalData'>): number | undefined {
  const status = log.additionalData?.status;
  return typeof status === 'number' ? status : undefined;
}

const BROWSERS: ReadonlyArray<[RegExp, string]> = [
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
  [/PostmanRuntime/, 'Postman'],
  [/curl\//, 'curl'],
  [/okhttp/i, 'Android app'],
];
const SYSTEMS: ReadonlyArray<[RegExp, string]> = [
  [/Windows/, 'Windows'],
  [/iPhone|iPad|iOS/, 'iOS'],
  [/Android/, 'Android'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

/** "Chrome on macOS" from a user agent, or undefined when nothing is recognized. */
export function describeUserAgent(userAgent: string | null): string | undefined {
  if (!userAgent) return undefined;
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system;
}
