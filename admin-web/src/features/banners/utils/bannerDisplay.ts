import { formatDateTime } from '@/utils/formatters';
import { sanitizeUrl } from '@/utils/security';

import type { Banner, BannerDisplayState } from '../types/banner.types';

/** Chip colors follow the spec: live green, inactive red, scheduled orange, expired grey. */
export const DISPLAY_STATE_META: Record<
  BannerDisplayState,
  { label: string; color: 'success' | 'error' | 'warning' | 'default'; description: string }
> = {
  live: { label: 'Active', color: 'success', description: 'Shown on the app and website now.' },
  scheduled: {
    label: 'Scheduled',
    color: 'warning',
    description: 'Active, but the start date is still in the future.',
  },
  expired: {
    label: 'Expired',
    color: 'default',
    description: 'Active, but the end date has passed. It is no longer shown.',
  },
  inactive: {
    label: 'Inactive',
    color: 'error',
    description: 'Switched off; never shown, whatever the schedule.',
  },
};

/** "20 May 2026, 12:00" / "No start" etc. */
export function scheduleBound(value: string | null, fallback: string): string {
  return value ? formatDateTime(value) : fallback;
}

export function hasSchedule(banner: Pick<Banner, 'startDate' | 'endDate'>): boolean {
  return banner.startDate !== null || banner.endDate !== null;
}

/** Human description of the link target. */
export function linkLabel(banner: Pick<Banner, 'linkType' | 'link'>): string {
  if (!banner.linkType || !banner.link) return 'No link';
  return banner.linkType === 'internal' ? `App page ${banner.link}` : banner.link;
}

/** An external link that is safe to put in an `href`, or null. */
export function safeExternalHref(banner: Pick<Banner, 'linkType' | 'link'>): string | null {
  return banner.linkType === 'external' ? sanitizeUrl(banner.link) : null;
}
