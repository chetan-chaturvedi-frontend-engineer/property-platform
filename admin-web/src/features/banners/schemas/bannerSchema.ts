import { z } from 'zod';

import { BANNER_STATUSES } from '../types/banner.types';
import { externalLinkError, internalLinkError } from '../utils/bannerOptions';

/** Limits of `Banner` on the backend (`CreateBannerForm`, `UpdateBannerRequest`). */
export const BANNER_LIMITS = {
  title: 255,
  link: 2048,
} as const;

/** Select value of the internal link picker that reveals a free path input. */
export const CUSTOM_PATH = '__custom__';

export const LINK_CHOICES = ['none', 'internal', 'external'] as const;
export type LinkChoice = (typeof LINK_CHOICES)[number];

/** `datetime-local` value (`yyyy-MM-ddTHH:mm`) as a timestamp, or NaN. */
export const localTime = (value: string) => (value ? new Date(value).getTime() : Number.NaN);

interface SchemaOptions {
  /** A new banner needs an image; an edit keeps the current one unless replaced. */
  requireImage: boolean;
  /** New banners must not end in the past (they would be expired on creation). */
  rejectPastEnd: boolean;
}

/** Client-side mirror of the backend rules; the backend repeats every check. */
export function bannerFormSchema({ requireImage, rejectPastEnd }: SchemaOptions) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(1, 'Enter the banner title')
        .max(BANNER_LIMITS.title, `Title must be at most ${BANNER_LIMITS.title} characters`),
      type: z.string().min(1, 'Select the banner type'),
      placement: z.string().min(1, 'Select where the banner is shown'),
      linkType: z.enum(LINK_CHOICES),
      internalTarget: z.string(),
      internalPath: z.string().trim(),
      externalUrl: z.string().trim(),
      image: z.instanceof(File).nullable(),
      status: z.enum(BANNER_STATUSES),
      scheduled: z.boolean(),
      startDate: z.string(),
      endDate: z.string(),
    })
    .superRefine((values, ctx) => {
      if (requireImage && !values.image) {
        ctx.addIssue({ code: 'custom', path: ['image'], message: 'Upload the banner image' });
      }
      if (values.linkType === 'internal') {
        const custom = values.internalTarget === CUSTOM_PATH;
        const link = custom ? values.internalPath : values.internalTarget;
        const path = custom ? 'internalPath' : 'internalTarget';
        if (!link) {
          ctx.addIssue({
            code: 'custom',
            path: [path],
            message: custom ? 'Enter the app path' : 'Select the page to open',
          });
        } else {
          const error =
            link.length > BANNER_LIMITS.link
              ? `At most ${BANNER_LIMITS.link} characters`
              : internalLinkError(link);
          if (error) ctx.addIssue({ code: 'custom', path: [path], message: error });
        }
      }
      if (values.linkType === 'external') {
        const error = !values.externalUrl
          ? 'Enter the URL to open'
          : values.externalUrl.length > BANNER_LIMITS.link
            ? `At most ${BANNER_LIMITS.link} characters`
            : externalLinkError(values.externalUrl);
        if (error) ctx.addIssue({ code: 'custom', path: ['externalUrl'], message: error });
      }
      if (values.scheduled) {
        // Both bounds are optional on the backend (open start / no expiry), but a schedule needs one.
        const start = localTime(values.startDate);
        const end = localTime(values.endDate);
        if (Number.isNaN(start) && Number.isNaN(end)) {
          ctx.addIssue({
            code: 'custom',
            path: ['startDate'],
            message: 'Choose a start date, an end date, or both',
          });
        } else if (Number.isNaN(end)) {
          return;
        } else if (!Number.isNaN(start) && end <= start) {
          ctx.addIssue({
            code: 'custom',
            path: ['endDate'],
            message: 'The end must be after the start',
          });
        } else if (rejectPastEnd && end < Date.now()) {
          ctx.addIssue({
            code: 'custom',
            path: ['endDate'],
            message: 'The end is in the past; the banner would never be shown',
          });
        }
      }
    });
}

export type BannerFormValues = z.infer<ReturnType<typeof bannerFormSchema>>;
