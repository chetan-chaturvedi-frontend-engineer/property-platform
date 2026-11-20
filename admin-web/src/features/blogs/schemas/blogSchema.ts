import { z } from 'zod';

import { BLOG_LIMITS } from '../utils/blogDisplay';
import { SLUG_PATTERN } from '../utils/blogSlug';

/**
 * How the publication time is set when publishing: `now`, a chosen `schedule` time, or `keep` the
 * saved time of an already published blog.
 */
export const PUBLISH_MODES = ['now', 'schedule', 'keep'] as const;
export type PublishMode = (typeof PUBLISH_MODES)[number];

/** Which header button submitted the form. */
export const SAVE_INTENTS = ['draft', 'publish'] as const;
export type SaveIntent = (typeof SAVE_INTENTS)[number];

/** `datetime-local` value (`yyyy-MM-ddTHH:mm`) as a timestamp, or NaN. */
export const localTime = (value: string) => (value ? new Date(value).getTime() : Number.NaN);

/** True when sanitized-or-not editor HTML has visible text or an image, as the backend requires. */
export function hasVisibleContent(html: string): boolean {
  if (!html) return false;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').trim() !== '' || doc.body.querySelector('img') !== null;
}

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max.toLocaleString()} characters`);

/** Client-side mirror of the backend rules; the backend repeats every check. */
export const blogFormSchema = z
  .object({
    intent: z.enum(SAVE_INTENTS),
    title: z
      .string()
      .trim()
      .min(1, 'Enter the blog title')
      .max(BLOG_LIMITS.title, `Title must be at most ${BLOG_LIMITS.title} characters`),
    /** True once the user edits the slug; until then it follows the title and is not sent. */
    slugEdited: z.boolean(),
    slug: z.string().trim().max(BLOG_LIMITS.slug, `At most ${BLOG_LIMITS.slug} characters`),
    categoryId: z.number().int().positive().nullable(),
    shortDescription: optionalText(BLOG_LIMITS.shortDescription, 'Short description'),
    content: z
      .string()
      .max(BLOG_LIMITS.content, 'The content is too long; split it into several posts')
      .refine(hasVisibleContent, 'Write the blog content'),
    tags: z.array(z.string()).max(BLOG_LIMITS.tags, `At most ${BLOG_LIMITS.tags} tags`),
    image: z.instanceof(File).nullable(),
    /** Edit only: remove the saved feature image on save. */
    removeImage: z.boolean(),
    publishMode: z.enum(PUBLISH_MODES),
    publishAt: z.string(),
    metaTitle: optionalText(BLOG_LIMITS.metaTitle, 'Meta title'),
    metaDescription: optionalText(BLOG_LIMITS.metaDescription, 'Meta description'),
  })
  .superRefine((values, ctx) => {
    if (values.slugEdited && values.slug && !SLUG_PATTERN.test(values.slug)) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: 'Use lowercase letters and digits separated by single hyphens',
      });
    }
    if (values.slugEdited && !values.slug) {
      ctx.addIssue({ code: 'custom', path: ['slug'], message: 'Enter the URL slug' });
    }
    if (values.intent !== 'publish') return;
    if (values.categoryId === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['categoryId'],
        message: 'Select a category to publish',
      });
    }
    if (values.publishMode === 'schedule') {
      const time = localTime(values.publishAt);
      if (Number.isNaN(time)) {
        ctx.addIssue({ code: 'custom', path: ['publishAt'], message: 'Choose the date and time' });
      } else if (time <= Date.now()) {
        ctx.addIssue({
          code: 'custom',
          path: ['publishAt'],
          message: 'Choose a time in the future, or publish immediately',
        });
      }
    }
  });

export type BlogFormValues = z.infer<typeof blogFormSchema>;
