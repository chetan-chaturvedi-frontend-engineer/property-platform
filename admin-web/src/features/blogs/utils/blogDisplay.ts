import type { ImageDimensions } from '@/utils/image';

import type { BlogPublicState, BlogSummary } from '../types/blog.types';

/** Chip colors follow the spec: live green, draft grey, scheduled orange, hidden red. */
export const PUBLIC_STATE_META: Record<
  BlogPublicState,
  { label: string; color: 'success' | 'warning' | 'error' | 'default'; description: string }
> = {
  live: {
    label: 'Published',
    color: 'success',
    description: 'Live on the website and app.',
  },
  scheduled: {
    label: 'Scheduled',
    color: 'warning',
    description: 'Published with a future date; it goes live automatically at that time.',
  },
  draft: {
    label: 'Draft',
    color: 'default',
    description: 'Not published; only admins can see it.',
  },
  category_hidden: {
    label: 'Hidden',
    color: 'error',
    description: 'Published, but its category is inactive, so visitors cannot see it.',
  },
};

/** Backend limits (`Blog` entity and request validation). */
export const BLOG_LIMITS = {
  title: 255,
  slug: 255,
  shortDescription: 1000,
  content: 100_000,
  metaTitle: 255,
  metaDescription: 1000,
  tags: 20,
  tag: 50,
} as const;

/** Recommended (not enforced) feature image size: the usual social sharing ratio. */
export const RECOMMENDED_BLOG_IMAGE: ImageDimensions = { width: 1200, height: 630 };

/** What search engines typically show; guidance only, not enforced by the backend. */
export const SEO_RECOMMENDED = { title: 60, description: 160 } as const;

const WORDS_PER_MINUTE = 200;

/** Visible text of sanitized blog HTML, parsed inertly (`DOMParser` never runs scripts or loads images). */
export function htmlToText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Block ends become spaces so words of adjacent paragraphs do not merge.
  doc.body
    .querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, br, blockquote, pre')
    .forEach((node) => node.after(' '));
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Estimated reading time in whole minutes (at least 1 for any text). */
export function readingMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function readingTimeLabel(words: number): string {
  const minutes = readingMinutes(words);
  return minutes === 0 ? '—' : `${minutes} min read`;
}

/** "Published 20 May" / "Scheduled for …" / "Not published" line under a date cell. */
export function publicationNote(blog: Pick<BlogSummary, 'publicState' | 'publishedAt'>): string {
  switch (blog.publicState) {
    case 'scheduled':
      return 'Goes live automatically';
    case 'category_hidden':
      return 'Category inactive';
    case 'draft':
      return blog.publishedAt ? 'Unpublished' : 'Not published';
    default:
      return 'Live';
  }
}
