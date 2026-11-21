import { z } from 'zod';

import { hasVisibleContent } from '@/utils/html';
import { SLUG_PATTERN } from '@/utils/slug';

import {
  CONTENT_PAGE_LIMITS,
  CONTENT_PAGE_STATUSES,
  CONTENT_PAGE_TYPES,
} from '../types/contentPage.types';

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max.toLocaleString()} characters`);

/** Client-side mirror of `CreatePageRequest` / `UpdatePageRequest`; the backend repeats every check. */
export const contentPageFormSchema = z
  .object({
    heading: z
      .string()
      .trim()
      .min(1, 'Enter the page title')
      .max(
        CONTENT_PAGE_LIMITS.heading,
        `The title must be at most ${CONTENT_PAGE_LIMITS.heading} characters`,
      ),
    subHeading: optionalText(CONTENT_PAGE_LIMITS.subHeading, 'The sub heading'),
    /** True once the user edits the slug; until then it follows the title and is not sent. */
    slugEdited: z.boolean(),
    slug: z
      .string()
      .trim()
      .max(CONTENT_PAGE_LIMITS.slug, `At most ${CONTENT_PAGE_LIMITS.slug} characters`),
    content: z
      .string()
      .max(CONTENT_PAGE_LIMITS.content, 'The content is too long; split it into several pages')
      .refine(hasVisibleContent, 'Write the page content'),
    type: z.enum(CONTENT_PAGE_TYPES),
    status: z.enum(CONTENT_PAGE_STATUSES),
    metaTitle: optionalText(CONTENT_PAGE_LIMITS.metaTitle, 'Meta title'),
    metaDescription: optionalText(CONTENT_PAGE_LIMITS.metaDescription, 'Meta description'),
    metaKeywords: optionalText(CONTENT_PAGE_LIMITS.metaKeywords, 'Meta keywords'),
  })
  .superRefine((values, ctx) => {
    if (!values.slugEdited) return;
    if (!values.slug) {
      ctx.addIssue({ code: 'custom', path: ['slug'], message: 'Enter the URL slug' });
    } else if (!SLUG_PATTERN.test(values.slug)) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: 'Use lowercase letters and digits separated by single hyphens',
      });
    }
  });

export type ContentPageFormValues = z.infer<typeof contentPageFormSchema>;
