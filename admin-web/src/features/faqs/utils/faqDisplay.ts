import type { FaqCategory, FaqStatus } from '../types/faq.types';

/** Status chip text and color (published green, draft orange) with a tooltip explanation. */
export const FAQ_STATUS_META: Record<
  FaqStatus,
  { label: string; color: 'success' | 'warning'; description: string }
> = {
  publish: {
    label: 'Published',
    color: 'success',
    description: 'Shown on the website and app (when its category is configured).',
  },
  draft: {
    label: 'Draft',
    color: 'warning',
    description: 'Not published; only admins can see it.',
  },
};

export const FAQ_STATUS_OPTIONS: ReadonlyArray<{ value: FaqStatus; label: string }> = [
  { value: 'publish', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

/** Theme palette colors for category badges, cycled in the configured category order. */
export const CATEGORY_TONES = ['primary', 'info', 'warning', 'success', 'secondary'] as const;
export type CategoryTone = (typeof CATEGORY_TONES)[number] | 'neutral';

/** Stable badge color of a category: by its position in the configuration; neutral when removed. */
export function categoryTone(key: string, categories: readonly FaqCategory[]): CategoryTone {
  const index = categories.findIndex((category) => category.key === key);
  if (index < 0) return 'neutral';
  return CATEGORY_TONES[index % CATEGORY_TONES.length] ?? 'primary';
}

/** Visible text of answer HTML (for validation and counts), without rendering it. */
export function htmlToText(html: string): string {
  if (!html) return '';
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
}

/**
 * Editor formatting that the FAQ answer sanitizer keeps: no headings, images or tables (removed on
 * save), but strikethrough is allowed.
 */
export const FAQ_RICH_TEXT_FEATURES = {
  headings: false,
  images: false,
  tables: false,
  strike: true,
} as const;
