import { humanizeCode } from '@/utils/formatters';

/**
 * Mirrors the backend's `app.banner` configuration (`backend/src/main/resources/application.yml`).
 * There is no endpoint that lists these values, so they are kept here; the backend still validates
 * every request and rejects values it does not accept. Update this file with the config.
 */
export const BANNER_CONFIG = {
  types: ['promotion', 'announcement', 'offer'],
  placements: ['home_top', 'home_middle', 'property_list', 'property_detail'],
  /** Routes an internal link may open: the route or any path below it ("/" = home page only). */
  internalLinkPrefixes: [
    '/',
    '/properties',
    '/projects',
    '/offers',
    '/blogs',
    '/pages',
    '/faqs',
    '/subscription-plans',
  ],
} as const;

const TYPE_LABELS: Record<string, string> = {
  promotion: 'Promotion',
  announcement: 'Announcement',
  offer: 'Offer',
};

const PLACEMENT_LABELS: Record<string, string> = {
  home_top: 'Homepage - Top',
  home_middle: 'Homepage - Middle',
  property_list: 'Property listing',
  property_detail: 'Property details',
};

/** Label of a type key; unknown (e.g. retired) keys are humanized instead of hidden. */
export function bannerTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? humanizeCode(type);
}

export function bannerPlacementLabel(placement: string): string {
  return PLACEMENT_LABELS[placement] ?? humanizeCode(placement);
}

export interface BannerOption {
  value: string;
  label: string;
}

export const BANNER_TYPE_OPTIONS: readonly BannerOption[] = BANNER_CONFIG.types.map((value) => ({
  value,
  label: bannerTypeLabel(value),
}));

export const BANNER_PLACEMENT_OPTIONS: readonly BannerOption[] = BANNER_CONFIG.placements.map(
  (value) => ({ value, label: bannerPlacementLabel(value) }),
);

/** Adds a saved value that is no longer configured (retired), so editing does not silently drop it. */
export function withSavedOption(
  options: readonly BannerOption[],
  value: string | undefined,
  label: (value: string) => string,
): readonly BannerOption[] {
  if (!value || options.some((option) => option.value === value)) return options;
  return [...options, { value, label: `${label(value)} (retired)` }];
}

/** App screens an internal link can open directly, in menu order. */
export const INTERNAL_ROUTE_OPTIONS: readonly BannerOption[] = [
  { value: '/', label: 'Home' },
  { value: '/properties', label: 'Properties' },
  { value: '/projects', label: 'Projects' },
  { value: '/offers', label: 'Offers' },
  { value: '/blogs', label: 'Blogs' },
  { value: '/faqs', label: 'FAQs' },
  { value: '/subscription-plans', label: 'Subscription plans' },
];

/** Root-relative path with an optional query; same pattern as the backend's `BannerRules`. */
const INTERNAL_LINK = /^\/[A-Za-z0-9._~/-]*(\?[A-Za-z0-9._~=&%+-]*)?$/;

/**
 * Same rule as the backend: a path inside an allowed route, without "//", dot segments, fragments
 * or backslashes. Returns an error message, or null when the path is accepted.
 */
export function internalLinkError(link: string): string | null {
  const message = 'Enter a path to an allowed app route, e.g. /offers/diwali';
  if (!INTERNAL_LINK.test(link)) return message;
  const path = link.split('?', 1)[0] ?? '';
  const unsafe = path.includes('//') || path.split('/').some((s) => s === '.' || s === '..');
  const allowed = BANNER_CONFIG.internalLinkPrefixes.some((prefix) =>
    prefix === '/' ? path === '/' : path === prefix || path.startsWith(`${prefix}/`),
  );
  return unsafe || !allowed ? message : null;
}

/** Same rule as the backend: `https://` only, a host, no credentials, default port. */
export function externalLinkError(link: string): string | null {
  const message = 'Enter an https:// URL without a username or password';
  // Exact lowercase scheme, no whitespace, control characters or backslashes.
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  if (!link.startsWith('https://') || /[\u0000- \u007f\\]/.test(link)) return message;
  try {
    const url = new URL(link);
    const valid = url.hostname !== '' && !url.username && !url.password && url.port === '';
    return valid ? null : message;
  } catch {
    return message;
  }
}
