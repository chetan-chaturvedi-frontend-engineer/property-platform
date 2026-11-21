import { http, HttpResponse } from 'msw';

import {
  BANNER_LINK_TYPES,
  BANNER_SORT_FIELDS,
  BANNER_STATUSES,
  type Banner,
  type BannerLinkType,
  type BannerStatus,
} from '@/features/banners/types/banner.types';
import {
  BANNER_CONFIG,
  externalLinkError,
  internalLinkError,
} from '@/features/banners/utils/bannerOptions';
import type { PageResponse } from '@/types/api.types';

import { decodeMockImage, displayStateAt, type StoredBanner } from '../mocks/bannerMockData';
import { mockDb } from '../mocks/mockDb';

import { apiPath, csrfRejection, problem } from './problem';

/** Mirrors `backend/docs/api/banners.md`, `BannerService` and `BannerRules`. */

const BASE = '/admin/banners';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const PATCH_FIELDS = new Set([
  'title',
  'type',
  'placement',
  'linkType',
  'link',
  'status',
  'startDate',
  'endDate',
]);

type Body = Record<string, unknown>;
type Authorized = { error: Response } | { ok: true; permissions: readonly string[] };

function authorize(request: Request, required: string, write = false): Authorized {
  if (write) {
    const rejected = csrfRejection(request, mockDb.csrfToken());
    if (rejected) return { error: rejected };
  }
  const user = mockDb.sessionUser();
  if (!user) return { error: problem(401, 'unauthorized', 'Authentication required.') };
  if (![required, 'ADMIN_PANEL_ACCESS'].every((p) => user.permissions.includes(p))) {
    return { error: problem(403, 'access_denied', 'Access denied.') };
  }
  return { ok: true, permissions: user.permissions };
}

const notFound = () => problem(404, 'banner_not_found', 'Banner not found.');
const invalid = (errors: Record<string, string>) =>
  problem(400, 'validation_failed', 'Validation failed', { errors });
const statusForbidden = () =>
  problem(
    403,
    'banner_status_change_forbidden',
    'You are not allowed to change the status of banners.',
  );

function toResponse(banner: StoredBanner, now = Date.now()): Banner {
  const { imageFile, ...rest } = banner;
  return {
    ...rest,
    imageUrl: `/api/v1/admin/banners/${banner.id}/image/${imageFile}`,
    displayState: displayStateAt(banner, now),
  };
}

const IMAGE_TYPES = [
  { ext: ['jpg', 'jpeg'], sig: [[0, [0xff, 0xd8, 0xff]]] },
  { ext: ['png'], sig: [[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]] },
  {
    ext: ['webp'],
    sig: [
      [0, [0x52, 0x49, 0x46, 0x46]],
      [8, [0x57, 0x45, 0x42, 0x50]],
    ],
  },
] as const;

/** Same checks as `MediaUploadService`: type by content, extension matching it, size. */
async function readImage(
  value: FormDataEntryValue | null,
): Promise<{ error: Response } | { bytes: Uint8Array; ext: string }> {
  // Under Jest, jsdom's File reaches Node's FormData as the text "[object File]", so its bytes cannot
  // be checked there (the property handler has the same limit). Browsers (dev:mock) send real files.
  if (value === '[object File]') return { bytes: decodeMockImage('purple'), ext: 'png' };
  if (!value || typeof value === 'string') return { error: invalid({ image: 'is required' }) };
  if (value.size > MAX_IMAGE_BYTES) {
    return { error: problem(413, 'file_too_large', 'The file is larger than 10 MB.') };
  }
  const bytes = new Uint8Array(await value.arrayBuffer());
  const type = IMAGE_TYPES.find((candidate) =>
    candidate.sig.every(([offset, sig]) => sig.every((byte, i) => bytes[offset + i] === byte)),
  );
  const ext = value.name.split('.').pop()?.toLowerCase() ?? '';
  if (!type || (value.name.includes('.') && !type.ext.some((e) => e === ext))) {
    return { error: invalid({ image: 'must be a JPEG, PNG or WebP image' }) };
  }
  return { bytes, ext: type.ext[0] };
}

const fileName = (ext: string) => `${crypto.randomUUID()}.${ext}`;

function validLink(linkType: BannerLinkType | null, link: string | null): Record<string, string> {
  if (!linkType && !link) return {};
  if (!linkType) return { linkType: 'is required when link is set' };
  if (!link) return { link: 'is required when linkType is set' };
  if (link.length > 2048) return { link: 'size must be between 0 and 2048' };
  const error =
    linkType === 'internal'
      ? internalLinkError(link) && 'must be a path to an allowed app route, e.g. /offers'
      : externalLinkError(link) && 'must be an https URL without credentials';
  return error ? { link: error } : {};
}

function parseInstant(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

function matches(banner: StoredBanner, params: URLSearchParams): boolean {
  const search = params.get('search')?.trim().toLowerCase();
  if (search && !banner.title.toLowerCase().includes(search)) return false;
  for (const key of ['status', 'type', 'placement', 'linkType'] as const) {
    const value = params.get(key);
    if (value && banner[key] !== value) return false;
  }
  const bound = (key: string, field: 'startDate' | 'endDate', from: boolean) => {
    const value = params.get(key);
    if (!value) return true;
    const date = banner[field];
    // Like SQL: a NULL column never matches a date filter.
    if (!date) return false;
    return from ? date >= new Date(value).toISOString() : date <= new Date(value).toISOString();
  };
  return (
    bound('startDateFrom', 'startDate', true) &&
    bound('startDateTo', 'startDate', false) &&
    bound('endDateFrom', 'endDate', true) &&
    bound('endDateTo', 'endDate', false)
  );
}

type SortField = (typeof BANNER_SORT_FIELDS)[number];

function sortBanners(rows: StoredBanner[], sort: string | null): StoredBanner[] | null {
  const [field = 'createdAt', direction = sort ? 'asc' : 'desc'] = (sort ?? 'createdAt,desc').split(
    ',',
  );
  const known: SortField | undefined = BANNER_SORT_FIELDS.find((value) => value === field);
  if (!known) return null;
  const factor = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = a[known];
    const right = b[known];
    if (left !== right) {
      // PostgreSQL puts NULLs last ascending and first descending.
      if (left === null) return factor;
      if (right === null) return -factor;
      return (left < right ? -1 : 1) * factor;
    }
    return b.id - a.id;
  });
}

const idOf = (value: unknown) => Number(value);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]) =>
  allowed.find((candidate) => candidate === value);

export const bannerHandlers = [
  http.get(apiPath(BASE), ({ request }) => {
    const auth = authorize(request, 'BANNER_LIST');
    if ('error' in auth) return auth.error;
    const params = new URL(request.url).searchParams;
    const status = params.get('status');
    if (status && !oneOf(status, BANNER_STATUSES)) {
      return invalid({ status: 'must be active or inactive' });
    }
    const sorted = sortBanners(
      mockDb.banners().filter((banner) => matches(banner, params)),
      params.get('sort'),
    );
    if (!sorted) return invalid({ sort: `must be one of ${BANNER_SORT_FIELDS.join(', ')}` });
    const page = Number(params.get('page') ?? 0);
    const size = Math.min(Number(params.get('size') ?? 20), 100);
    const now = Date.now();
    const body: PageResponse<Banner> = {
      content: sorted.slice(page * size, page * size + size).map((row) => toResponse(row, now)),
      page,
      size,
      totalElements: sorted.length,
      totalPages: Math.ceil(sorted.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath(`${BASE}/:id/image/:file`), ({ request, params }) => {
    const auth = authorize(request, 'BANNER_VIEW');
    if ('error' in auth) return auth.error;
    const banner = mockDb.findBanner(idOf(params.id));
    if (!banner || banner.imageFile !== params.file) return notFound();
    const bytes = mockDb.bannerImage(banner.imageFile);
    if (!bytes) return notFound();
    const ext = banner.imageFile.split('.').pop();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return new HttpResponse(bytes.slice().buffer, {
      headers: { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' },
    });
  }),

  http.get(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const auth = authorize(request, 'BANNER_VIEW');
    if ('error' in auth) return auth.error;
    const banner = mockDb.findBanner(idOf(params.id));
    return banner ? HttpResponse.json(toResponse(banner)) : notFound();
  }),

  http.post(apiPath(BASE), async ({ request }) => {
    const auth = authorize(request, 'BANNER_CREATE', true);
    if ('error' in auth) return auth.error;
    const form = await request.formData();
    const text = (key: string) => {
      const value = form.get(key);
      return typeof value === 'string' && value !== '' ? value : null;
    };
    const statusValue = text('status');
    const status: BannerStatus | undefined =
      statusValue === null ? 'inactive' : oneOf(statusValue, BANNER_STATUSES);
    const errors: Record<string, string> = {};
    const title = text('title')?.trim() ?? '';
    if (!title) errors.title = 'must not be blank';
    else if (title.length > 255) errors.title = 'size must be between 0 and 255';
    if (!status) errors.status = 'must be active or inactive';
    if (
      Object.keys(errors).length === 0 &&
      status !== 'inactive' &&
      !auth.permissions.includes('BANNER_CHANGE_STATUS')
    ) {
      return statusForbidden();
    }
    const type = text('type');
    if (!type || !BANNER_CONFIG.types.some((value) => value === type)) {
      errors.type = `must be one of ${BANNER_CONFIG.types.join(', ')}`;
    }
    const placement = text('placement');
    if (!placement || !BANNER_CONFIG.placements.some((value) => value === placement)) {
      errors.placement = `must be one of ${BANNER_CONFIG.placements.join(', ')}`;
    }
    const linkTypeValue = text('linkType');
    const linkType =
      linkTypeValue === null ? null : (oneOf(linkTypeValue, BANNER_LINK_TYPES) ?? null);
    if (linkTypeValue !== null && !linkType) errors.linkType = 'must be internal or external';
    const link = text('link')?.trim() ?? null;
    Object.assign(errors, validLink(linkType, link));
    const startDate = parseInstant(text('startDate'));
    const endDate = parseInstant(text('endDate'));
    if (startDate === undefined) errors.startDate = 'must be an ISO-8601 instant';
    if (endDate === undefined) errors.endDate = 'must be an ISO-8601 instant';
    if (startDate && endDate && endDate < startDate)
      errors.endDate = 'must not be before startDate';
    if (Object.keys(errors).length > 0) return invalid(errors);

    const image = await readImage(form.get('image'));
    if ('error' in image) return image.error;
    const imageFile = fileName(image.ext);
    mockDb.storeBannerImage(imageFile, image.bytes);
    const now = new Date().toISOString();
    const banner: StoredBanner = {
      id: mockDb.nextBannerId(),
      title,
      type: type ?? '',
      placement: placement ?? '',
      linkType,
      link,
      imageFile,
      status: status ?? 'inactive',
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    mockDb.saveBanner(banner);
    mockDb.recordLog({
      module: 'banners',
      action: 'Banner: create',
      referenceId: banner.id,
      referenceType: 'Banner',
    });
    return HttpResponse.json(toResponse(banner), { status: 201 });
  }),

  http.patch(apiPath(`${BASE}/:id`), async ({ request, params }) => {
    const auth = authorize(request, 'BANNER_UPDATE', true);
    if ('error' in auth) return auth.error;
    const current = mockDb.findBanner(idOf(params.id));
    if (!current) return notFound();
    const body = (await request.json()) as Body;
    const unknown = Object.keys(body).find((key) => !PATCH_FIELDS.has(key));
    if (unknown) return invalid({ [unknown]: 'is not a known field' });

    const banner = { ...current };
    const errors: Record<string, string> = {};
    if ('status' in body) {
      const status = oneOf(body.status, BANNER_STATUSES);
      if (!status) errors.status = 'must be active or inactive';
      else if (status !== banner.status) {
        if (!auth.permissions.includes('BANNER_CHANGE_STATUS')) return statusForbidden();
        banner.status = status;
      }
    }
    if ('title' in body) {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title) errors.title = 'must not be blank';
      else if (title.length > 255) errors.title = 'size must be between 0 and 255';
      else banner.title = title;
    }
    if ('type' in body) {
      if (!BANNER_CONFIG.types.some((value) => value === body.type)) {
        errors.type = `must be one of ${BANNER_CONFIG.types.join(', ')}`;
      } else if (typeof body.type === 'string') banner.type = body.type;
    }
    if ('placement' in body) {
      if (!BANNER_CONFIG.placements.some((value) => value === body.placement)) {
        errors.placement = `must be one of ${BANNER_CONFIG.placements.join(', ')}`;
      } else if (typeof body.placement === 'string') banner.placement = body.placement;
    }
    if ('linkType' in body || 'link' in body) {
      const linkType =
        'linkType' in body
          ? body.linkType === null
            ? null
            : (oneOf(body.linkType, BANNER_LINK_TYPES) ?? null)
          : banner.linkType;
      if ('linkType' in body && body.linkType !== null && !linkType) {
        errors.linkType = 'must be internal or external';
      }
      const link =
        'link' in body
          ? typeof body.link === 'string'
            ? body.link.trim() || null
            : null
          : banner.link;
      const linkErrors = validLink(linkType, link);
      Object.assign(errors, linkErrors);
      if (Object.keys(linkErrors).length === 0) {
        banner.linkType = linkType;
        banner.link = link;
      }
    }
    if ('startDate' in body || 'endDate' in body) {
      const startDate = 'startDate' in body ? parseInstant(body.startDate) : banner.startDate;
      const endDate = 'endDate' in body ? parseInstant(body.endDate) : banner.endDate;
      if (startDate === undefined) errors.startDate = 'must be an ISO-8601 instant';
      if (endDate === undefined) errors.endDate = 'must be an ISO-8601 instant';
      if (startDate && endDate && endDate < startDate)
        errors.endDate = 'must not be before startDate';
      banner.startDate = startDate ?? null;
      banner.endDate = endDate ?? null;
    }
    if (Object.keys(errors).length > 0) return invalid(errors);
    const saved = { ...banner, updatedAt: new Date().toISOString() };
    mockDb.saveBanner(saved);
    mockDb.recordLog({
      module: 'banners',
      action: 'Banner: update',
      referenceId: saved.id,
      referenceType: 'Banner',
    });
    return HttpResponse.json(toResponse(saved));
  }),

  http.put(apiPath(`${BASE}/:id/image`), async ({ request, params }) => {
    const auth = authorize(request, 'BANNER_UPDATE', true);
    if ('error' in auth) return auth.error;
    const current = mockDb.findBanner(idOf(params.id));
    if (!current) return notFound();
    const image = await readImage((await request.formData()).get('image'));
    if ('error' in image) return image.error;
    const imageFile = fileName(image.ext);
    mockDb.storeBannerImage(imageFile, image.bytes);
    const saved = { ...current, imageFile, updatedAt: new Date().toISOString() };
    mockDb.saveBanner(saved);
    mockDb.recordLog({
      module: 'banners',
      action: 'Banner: replace image',
      referenceId: saved.id,
      referenceType: 'Banner',
    });
    return HttpResponse.json(toResponse(saved));
  }),

  http.delete(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const auth = authorize(request, 'BANNER_DELETE', true);
    if ('error' in auth) return auth.error;
    const current = mockDb.findBanner(idOf(params.id));
    if (!current) return notFound();
    mockDb.softDeleteBanner(current.id);
    mockDb.recordLog({
      module: 'banners',
      action: 'Banner: delete',
      referenceId: current.id,
      referenceType: 'Banner',
    });
    return new HttpResponse(null, { status: 204 });
  }),
];
