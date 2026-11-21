import type { ContentPageStatus, ContentPageType } from '../types/contentPage.types';

/** Status chip text and color (published green, draft orange) with a tooltip explanation. */
export const CONTENT_PAGE_STATUS_META: Record<
  ContentPageStatus,
  { label: string; color: 'success' | 'warning'; description: string }
> = {
  publish: {
    label: 'Published',
    color: 'success',
    description: 'Public on the website and app.',
  },
  draft: {
    label: 'Draft',
    color: 'warning',
    description: 'Not published; only admins can see it.',
  },
};

/** Type badge text and theme color (static blue, system purple). */
export const CONTENT_PAGE_TYPE_META: Record<
  ContentPageType,
  { label: string; tone: 'info' | 'primary'; description: string }
> = {
  static: {
    label: 'Static page',
    tone: 'info',
    description: 'A regular content page.',
  },
  system: {
    label: 'System page',
    tone: 'primary',
    description: 'Linked to from the website and app (for example the footer or sign-up).',
  },
};

export const CONTENT_PAGE_STATUS_OPTIONS: ReadonlyArray<{
  value: ContentPageStatus;
  label: string;
}> = [
  { value: 'publish', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

export const CONTENT_PAGE_TYPE_OPTIONS: ReadonlyArray<{ value: ContentPageType; label: string }> = [
  { value: 'static', label: 'Static page' },
  { value: 'system', label: 'System page' },
];

/** Public path of a page on the website (the same form banners link to). */
export const contentPagePath = (slug: string) => `/pages/${slug}`;

/** Comma-separated keywords as a clean list (blank entries dropped). */
export function splitKeywords(keywords: string | null | undefined): string[] {
  return (keywords ?? '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}
