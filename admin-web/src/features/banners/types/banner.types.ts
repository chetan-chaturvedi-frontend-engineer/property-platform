import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

/** Enums of `backend/docs/api/banners.md` (lowercase values, as sent and received). */
export const BANNER_STATUSES = ['active', 'inactive'] as const;
export type BannerStatus = (typeof BANNER_STATUSES)[number];

/** Computed by the backend from status and schedule at response time; never stored. */
export const BANNER_DISPLAY_STATES = ['live', 'scheduled', 'expired', 'inactive'] as const;
export type BannerDisplayState = (typeof BANNER_DISPLAY_STATES)[number];

export const BANNER_LINK_TYPES = ['internal', 'external'] as const;
export type BannerLinkType = (typeof BANNER_LINK_TYPES)[number];

/** Admin response of every banner endpoint; the list wraps it in `PageResponse`. */
export interface Banner {
  id: EntityId;
  title: string;
  /** One of `app.banner.types`; older banners may carry a retired value. */
  type: string;
  /** One of `app.banner.placements`; older banners may carry a retired value. */
  placement: string;
  /** Both null = the banner has no link. */
  linkType: Nullable<BannerLinkType>;
  link: Nullable<string>;
  /** API path that streams the image after authorization (session cookie), e.g. `/api/v1/admin/banners/1/image/x.webp`. */
  imageUrl: string;
  status: BannerStatus;
  displayState: BannerDisplayState;
  /** Inclusive; null = live as soon as it is active. */
  startDate: Nullable<IsoDateTime>;
  /** Inclusive; null = never expires. */
  endDate: Nullable<IsoDateTime>;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export const BANNER_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'title',
  'type',
  'placement',
  'status',
  'startDate',
  'endDate',
] as const;
export type BannerSortField = (typeof BANNER_SORT_FIELDS)[number];

/** Query parameters of `GET /admin/banners`; every given filter must match. */
export interface BannerFilters extends PageParams {
  /** Title contains, case-insensitive. Max 100. */
  search?: string;
  status?: BannerStatus;
  type?: string;
  placement?: string;
  linkType?: BannerLinkType;
  /** Inclusive ISO-8601 instants. */
  startDateFrom?: IsoDateTime;
  startDateTo?: IsoDateTime;
  endDateFrom?: IsoDateTime;
  endDateTo?: IsoDateTime;
}

/** Multipart fields of `POST /admin/banners`, sent with the `image` file. */
export interface CreateBannerRequest {
  title: string;
  type: string;
  placement: string;
  /** Given together with `link`, or both omitted. */
  linkType?: BannerLinkType;
  link?: string;
  /** Default `inactive`; `active` also needs `BANNER_CHANGE_STATUS`. */
  status?: BannerStatus;
  startDate?: IsoDateTime;
  endDate?: IsoDateTime;
}

/**
 * `PATCH /admin/banners/{id}` (JSON). Omitted fields keep their value; `null` clears linkType, link,
 * startDate and endDate only. The image has its own endpoint.
 */
export interface UpdateBannerRequest {
  title?: string;
  type?: string;
  placement?: string;
  linkType?: Nullable<BannerLinkType>;
  link?: Nullable<string>;
  status?: BannerStatus;
  startDate?: Nullable<IsoDateTime>;
  endDate?: Nullable<IsoDateTime>;
}

/**
 * Overview counts. There is no stats endpoint, so each one is the `totalElements` of a one-row list
 * request. `live` is derived: active minus scheduled minus expired (disjoint, since end ≥ start).
 */
export interface BannerCounts {
  total: number;
  active: number;
  inactive: number;
  scheduled: number;
  expired: number;
  live: number;
}

/** Pixel size of an image. */
export interface ImageDimensions {
  width: number;
  height: number;
}

/** Upload progress callback: 0-100. */
export type UploadProgressHandler = (percent: number) => void;

/** A content page from `GET /admin/pages` (fields used here only). */
export interface ContentPageOption {
  id: EntityId;
  heading: string;
  slug: string;
  status: 'draft' | 'publish';
}

/** A system log entry about one banner (fields used here only, `GET /admin/system-logs`). */
export interface BannerActivityEntry {
  id: EntityId;
  action: string;
  logLevel: 'info' | 'success' | 'warning';
  user: Nullable<{ id: EntityId; fullName: string }>;
  createdAt: IsoDateTime;
}
