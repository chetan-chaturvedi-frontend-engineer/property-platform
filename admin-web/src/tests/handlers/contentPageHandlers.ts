import { http, HttpResponse } from 'msw';

import {
  CONTENT_PAGE_LIMITS,
  CONTENT_PAGE_SORT_FIELDS,
  CONTENT_PAGE_STATUSES,
  CONTENT_PAGE_TYPES,
  type ContentPageSummary,
} from '@/features/contentPages/types/contentPage.types';
import type { PageResponse } from '@/types/api.types';
import { SLUG_PATTERN, slugify } from '@/utils/slug';

import type { StoredContentPage } from '../mocks/contentPageMockData';
import { mockDb } from '../mocks/mockDb';

import { apiPath, csrfRejection, problem } from './problem';

/** Mirrors `backend/docs/api/pages.md`, `AdminPageController` and `PageService`. */

const BASE = '/admin/pages';
const FIELDS = new Set([
  'heading',
  'subHeading',
  'slug',
  'content',
  'type',
  'status',
  'metaTitle',
  'metaDescription',
  'metaKeywords',
]);
const REQUIRED = ['heading', 'slug', 'content', 'type', 'status'] as const;
const OPTIONAL_TEXT = {
  subHeading: CONTENT_PAGE_LIMITS.subHeading,
  metaTitle: CONTENT_PAGE_LIMITS.metaTitle,
  metaDescription: CONTENT_PAGE_LIMITS.metaDescription,
  metaKeywords: CONTENT_PAGE_LIMITS.metaKeywords,
} as const;

type Body = Record<string, unknown>;
type Errors = Record<string, string>;

function authorize(request: Request, required: string, write = false): { error: Response } | null {
  if (write) {
    const rejected = csrfRejection(request, mockDb.csrfToken());
    if (rejected) return { error: rejected };
  }
  const user = mockDb.sessionUser();
  if (!user) return { error: problem(401, 'unauthorized', 'Authentication required.') };
  if (![required, 'ADMIN_PANEL_ACCESS'].every((p) => user.permissions.includes(p))) {
    return { error: problem(403, 'access_denied', 'Access denied.') };
  }
  return null;
}

const canPublish = () => mockDb.sessionUser()?.permissions.includes('PAGE_PUBLISH') ?? false;
const notFound = () => problem(404, 'page_not_found', 'Page not found.');
const invalid = (errors: Errors) =>
  problem(400, 'validation_failed', 'Validation failed', { errors });
const publishForbidden = () =>
  problem(403, 'page_publish_forbidden', 'Changing the status of a page needs PAGE_PUBLISH.');
const slugTaken = () => problem(409, 'page_slug_taken', 'Another page already uses this slug.');

function toSummary(page: StoredContentPage): ContentPageSummary {
  const {
    content: _content,
    metaTitle: _metaTitle,
    metaDescription: _metaDescription,
    metaKeywords: _metaKeywords,
    ...summary
  } = page;
  return summary;
}

/** Like `PageContent.sanitize` for what tests need: scripts and handlers removed, text required. */
function sanitize(html: string): string | null {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
  return clean.replace(/<[^>]+>/g, '').trim() || /<img\s/i.test(clean) ? clean : null;
}

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]) =>
  allowed.find((candidate) => candidate === value);

/** Field rules of `CreatePageRequest` / `UpdatePageRequest`; only the fields present are checked. */
function validate(body: Body, errors: Errors): Partial<StoredContentPage> {
  const out: Partial<StoredContentPage> = {};
  for (const key of Object.keys(body)) {
    if (!FIELDS.has(key)) errors[key] = 'is not allowed';
  }
  for (const key of REQUIRED) {
    if (key in body && body[key] === null) errors[key] = 'must not be null';
  }
  if (typeof body.heading === 'string') {
    const heading = body.heading.trim();
    if (!heading) errors.heading = 'must not be blank';
    else if (heading.length > CONTENT_PAGE_LIMITS.heading)
      errors.heading = 'size must be between 1 and 255';
    else out.heading = heading;
  }
  if (typeof body.slug === 'string') {
    if (!SLUG_PATTERN.test(body.slug) || body.slug.length > CONTENT_PAGE_LIMITS.slug) {
      errors.slug = 'must be lowercase letters and digits separated by single hyphens';
    } else out.slug = body.slug;
  }
  if (typeof body.content === 'string') {
    const content = sanitize(body.content);
    if (content === null) errors.content = 'must contain text or an image';
    else out.content = content;
  }
  if ('type' in body && body.type !== null) {
    const type = oneOf(body.type, CONTENT_PAGE_TYPES);
    if (!type) errors.type = 'must be static or system';
    else out.type = type;
  }
  if ('status' in body && body.status !== null) {
    const status = oneOf(body.status, CONTENT_PAGE_STATUSES);
    if (!status) errors.status = 'must be draft or publish';
    else out.status = status;
  }
  for (const [key, max] of Object.entries(OPTIONAL_TEXT)) {
    if (!(key in body)) continue;
    const value = body[key];
    if (value === null) {
      Object.assign(out, { [key]: null });
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > max) errors[key] = `size must be between 0 and ${max}`;
      else Object.assign(out, { [key]: trimmed || null });
    }
  }
  return out;
}

function matches(page: StoredContentPage, params: URLSearchParams): boolean {
  const search = params.get('search')?.trim().toLowerCase();
  if (
    search &&
    ![page.heading, page.subHeading ?? '', page.slug].some((text) =>
      text.toLowerCase().includes(search),
    )
  ) {
    return false;
  }
  const status = params.get('status');
  if (status && page.status !== status) return false;
  const type = params.get('type');
  return !type || page.type === type;
}

/** `sort` (default `createdAt,desc`), `id` desc as tiebreaker; null for an unknown field. */
function sortPages(rows: StoredContentPage[], sort: string | null): StoredContentPage[] | null {
  const [field = 'createdAt', direction = 'asc'] = (sort ?? 'createdAt,desc').split(',');
  const known = CONTENT_PAGE_SORT_FIELDS.find((value) => value === field);
  if (!known) return null;
  const factor = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = a[known];
    const right = b[known];
    if (left !== right) return (left < right ? -1 : 1) * factor;
    return b.id - a.id;
  });
}

function uniqueSlug(heading: string): string {
  const base = slugify(heading) || 'page';
  let candidate = base;
  for (let n = 2; mockDb.contentPages().some((page) => page.slug === candidate); n++) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}

const log = (action: string, id: number) =>
  mockDb.recordLog({ module: 'pages', action, referenceId: id, referenceType: 'Page' });

export const contentPageHandlers = [
  http.get(apiPath(BASE), ({ request }) => {
    const denied = authorize(request, 'PAGE_VIEW');
    if (denied) return denied.error;
    const params = new URL(request.url).searchParams;
    const status = params.get('status');
    if (status && !oneOf(status, CONTENT_PAGE_STATUSES))
      return invalid({ status: 'must be draft or publish' });
    const type = params.get('type');
    if (type && !oneOf(type, CONTENT_PAGE_TYPES))
      return invalid({ type: 'must be static or system' });
    const sorted = sortPages(
      mockDb.contentPages().filter((page) => matches(page, params)),
      params.get('sort'),
    );
    if (!sorted)
      return invalid({ sort: `must be one of ${CONTENT_PAGE_SORT_FIELDS.join(', ')}, id` });
    const page = Number(params.get('page') ?? 0);
    const size = Math.min(Number(params.get('size') ?? 20), 100);
    const body: PageResponse<ContentPageSummary> = {
      content: sorted.slice(page * size, page * size + size).map(toSummary),
      page,
      size,
      totalElements: sorted.length,
      totalPages: Math.ceil(sorted.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const denied = authorize(request, 'PAGE_VIEW');
    if (denied) return denied.error;
    const page = mockDb.findContentPage(Number(params.id));
    return page ? HttpResponse.json(page) : notFound();
  }),

  http.post(apiPath(BASE), async ({ request }) => {
    const denied = authorize(request, 'PAGE_CREATE', true);
    if (denied) return denied.error;
    const body = (await request.json()) as Body;
    const errors: Errors = {};
    const fields = validate(body, errors);
    for (const key of ['heading', 'content'] as const) {
      if (!(key in body) && !errors[key]) errors[key] = 'must not be blank';
    }
    if (Object.keys(errors).length > 0) return invalid(errors);
    if (fields.status === 'publish' && !canPublish()) return publishForbidden();
    if (fields.slug && mockDb.contentPages().some((page) => page.slug === fields.slug)) {
      return slugTaken();
    }
    const now = new Date().toISOString();
    const page: StoredContentPage = {
      id: mockDb.nextContentPageId(),
      heading: fields.heading ?? '',
      subHeading: fields.subHeading ?? null,
      slug: fields.slug ?? uniqueSlug(fields.heading ?? ''),
      content: fields.content ?? '',
      type: fields.type ?? 'static',
      status: fields.status ?? 'draft',
      metaTitle: fields.metaTitle ?? null,
      metaDescription: fields.metaDescription ?? null,
      metaKeywords: fields.metaKeywords ?? null,
      createdAt: now,
      updatedAt: now,
    };
    mockDb.saveContentPage(page);
    log('Page: create', page.id);
    return HttpResponse.json(page, { status: 201 });
  }),

  http.patch(apiPath(`${BASE}/:id`), async ({ request, params }) => {
    const denied = authorize(request, 'PAGE_UPDATE', true);
    if (denied) return denied.error;
    const current = mockDb.findContentPage(Number(params.id));
    if (!current) return notFound();
    const body = (await request.json()) as Body;
    const errors: Errors = {};
    const fields = validate(body, errors);
    if (Object.keys(errors).length > 0) return invalid(errors);
    if (fields.status !== undefined && fields.status !== current.status && !canPublish()) {
      return publishForbidden();
    }
    if (
      fields.slug &&
      mockDb.contentPages().some((page) => page.slug === fields.slug && page.id !== current.id)
    ) {
      return slugTaken();
    }
    const saved = { ...current, ...fields, updatedAt: new Date().toISOString() };
    mockDb.saveContentPage(saved);
    log('Page: update', saved.id);
    return HttpResponse.json(saved);
  }),

  http.delete(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const denied = authorize(request, 'PAGE_DELETE', true);
    if (denied) return denied.error;
    const current = mockDb.findContentPage(Number(params.id));
    if (!current) return notFound();
    mockDb.deleteContentPage(current.id);
    log('Page: delete', current.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
