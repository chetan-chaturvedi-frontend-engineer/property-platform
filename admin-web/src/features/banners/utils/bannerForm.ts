import type { Path } from 'react-hook-form';

import type { Nullable } from '@/types/common.types';

import { type BannerFormValues, CUSTOM_PATH } from '../schemas/bannerSchema';
import type {
  Banner,
  BannerLinkType,
  CreateBannerRequest,
  UpdateBannerRequest,
} from '../types/banner.types';

/** Form fields the backend's field errors can be mapped to (`applyServerErrors`). */
export const BANNER_FORM_FIELDS: readonly Path<BannerFormValues>[] = [
  'title',
  'type',
  'placement',
  'status',
  'startDate',
  'endDate',
  'image',
];

const pad = (value: number) => String(value).padStart(2, '0');

/** ISO instant → `datetime-local` value in the browser's time zone. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** `datetime-local` value (browser time zone) → ISO instant in UTC, as the API expects. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Default schedule for a new banner: today 00:00 to 30 days later 23:59, local time. */
function defaultWindow(): { startDate: string; endDate: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  end.setHours(23, 59, 0, 0);
  return { startDate: toLocalInput(start.toISOString()), endDate: toLocalInput(end.toISOString()) };
}

export function emptyBannerForm(): BannerFormValues {
  return {
    title: '',
    type: '',
    placement: '',
    linkType: 'internal',
    internalTarget: '',
    internalPath: '',
    externalUrl: '',
    image: null,
    status: 'active',
    scheduled: false,
    ...defaultWindow(),
  };
}

/** Form values of a saved banner; also the start of a duplicate (with `image` set by the caller). */
export function toBannerFormValues(banner: Banner): BannerFormValues {
  const scheduled = banner.startDate !== null || banner.endDate !== null;
  return {
    title: banner.title,
    type: banner.type,
    placement: banner.placement,
    linkType: banner.linkType ?? 'none',
    internalTarget: banner.linkType === 'internal' ? (banner.link ?? '') : '',
    internalPath: '',
    externalUrl: banner.linkType === 'external' ? (banner.link ?? '') : '',
    image: null,
    status: banner.status,
    scheduled,
    ...(scheduled
      ? { startDate: toLocalInput(banner.startDate), endDate: toLocalInput(banner.endDate) }
      : defaultWindow()),
  };
}

/** The link pair as the API stores it (both null = no link). */
export function formLink(
  values: Pick<BannerFormValues, 'linkType' | 'internalTarget' | 'internalPath' | 'externalUrl'>,
): {
  linkType: Nullable<BannerLinkType>;
  link: Nullable<string>;
} {
  if (values.linkType === 'internal') {
    const link =
      values.internalTarget === CUSTOM_PATH ? values.internalPath.trim() : values.internalTarget;
    return link ? { linkType: 'internal', link } : { linkType: null, link: null };
  }
  if (values.linkType === 'external' && values.externalUrl.trim()) {
    return { linkType: 'external', link: values.externalUrl.trim() };
  }
  return { linkType: null, link: null };
}

/** The schedule as the API stores it; off = no bounds (live whenever the banner is active). */
export function formSchedule(values: BannerFormValues): {
  startDate: Nullable<string>;
  endDate: Nullable<string>;
} {
  if (!values.scheduled) return { startDate: null, endDate: null };
  return { startDate: fromLocalInput(values.startDate), endDate: fromLocalInput(values.endDate) };
}

/**
 * `POST` fields. Without `BANNER_CHANGE_STATUS` the status is left out, so the backend saves the
 * banner as inactive instead of refusing the request.
 */
export function toCreateRequest(
  values: BannerFormValues,
  { canChangeStatus }: { canChangeStatus: boolean },
): CreateBannerRequest {
  const { linkType, link } = formLink(values);
  const { startDate, endDate } = formSchedule(values);
  return {
    title: values.title.trim(),
    type: values.type,
    placement: values.placement,
    ...(linkType && link ? { linkType, link } : {}),
    ...(canChangeStatus ? { status: values.status } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };
}

/**
 * `PATCH` body with only what changed. The link pair and the schedule are sent as pairs, since the
 * backend validates them together.
 */
export function toUpdateRequest(
  banner: Banner,
  values: BannerFormValues,
  { canChangeStatus }: { canChangeStatus: boolean },
): UpdateBannerRequest {
  const request: UpdateBannerRequest = {};
  const title = values.title.trim();
  if (title !== banner.title) request.title = title;
  if (values.type !== banner.type) request.type = values.type;
  if (values.placement !== banner.placement) request.placement = values.placement;
  if (canChangeStatus && values.status !== banner.status) request.status = values.status;

  const { linkType, link } = formLink(values);
  if (linkType !== banner.linkType || link !== banner.link) {
    request.linkType = linkType;
    request.link = link;
  }

  const { startDate, endDate } = formSchedule(values);
  if (!sameInstant(startDate, banner.startDate) || !sameInstant(endDate, banner.endDate)) {
    request.startDate = startDate;
    request.endDate = endDate;
  }
  return request;
}

/** The form edits minutes; a saved value with seconds is unchanged if it is the same minute. */
function sameInstant(a: Nullable<string>, b: Nullable<string>): boolean {
  if (a === null || b === null) return a === b;
  return Math.floor(Date.parse(a) / 60_000) === Math.floor(Date.parse(b) / 60_000);
}
