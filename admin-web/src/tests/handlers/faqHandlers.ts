import { http, HttpResponse } from 'msw';

import {
  FAQ_LIMITS,
  FAQ_SORT_FIELDS,
  FAQ_STATUSES,
  type Faq,
  type FaqStatus,
  type FaqSummary,
} from '@/features/faqs/types/faq.types';
import type { PageResponse } from '@/types/api.types';

import { MOCK_FAQ_CATEGORIES, type StoredFaq } from '../mocks/faqMockData';
import { mockDb } from '../mocks/mockDb';

import { apiPath, csrfRejection, problem } from './problem';

/** Mirrors `backend/docs/api/faqs.md`, `AdminFaqController` and `FaqService`. */

const BASE = '/admin/faqs';
const FIELDS = new Set(['question', 'answer', 'category', 'status', 'sortOrder']);

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

const canPublish = () => mockDb.sessionUser()?.permissions.includes('FAQ_PUBLISH') ?? false;
const notFound = () => problem(404, 'faq_not_found', 'FAQ not found.');
const invalid = (errors: Errors) =>
  problem(400, 'validation_failed', 'Validation failed', { errors });
const publishForbidden = () =>
  problem(403, 'faq_publish_forbidden', 'Changing the status of a FAQ needs FAQ_PUBLISH.');

const labelOf = (key: string) =>
  MOCK_FAQ_CATEGORIES.find((category) => category.key === key)?.label ?? null;

function toSummary({ answer: _answer, ...faq }: StoredFaq): FaqSummary {
  return { ...faq, categoryLabel: labelOf(faq.category) };
}

const toResponse = (faq: StoredFaq): Faq => ({ ...faq, categoryLabel: labelOf(faq.category) });

/** Like `FaqAnswer.sanitize` for what tests need: scripts and handlers removed, text required. */
function sanitize(html: string): string | null {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
  return clean.replace(/<[^>]+>/g, '').trim() ? clean : null;
}

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]) =>
  allowed.find((candidate) => candidate === value);

/** Field rules of `CreateFaqRequest` / `UpdateFaqRequest`; only the fields present are checked. */
function validate(body: Body, errors: Errors): Partial<StoredFaq> {
  const out: Partial<StoredFaq> = {};
  for (const key of Object.keys(body)) {
    if (!FIELDS.has(key)) errors[key] = 'is not allowed';
    else if (body[key] === null) errors[key] = 'must not be null';
  }
  if (typeof body.question === 'string') {
    const question = body.question.trim();
    if (!question) errors.question = 'must not be blank';
    else if (question.length > FAQ_LIMITS.question)
      errors.question = 'size must be between 0 and 500';
    else out.question = question;
  }
  if (typeof body.answer === 'string') {
    const answer = sanitize(body.answer);
    if (answer === null) errors.answer = 'must contain text';
    else out.answer = answer;
  }
  if (typeof body.category === 'string') {
    if (labelOf(body.category) === null) {
      errors.category = `must be one of ${MOCK_FAQ_CATEGORIES.map((c) => c.key).join(', ')}`;
    } else out.category = body.category;
  }
  if ('status' in body && body.status !== null) {
    const status: FaqStatus | undefined = oneOf(body.status, FAQ_STATUSES);
    if (!status) errors.status = 'must be draft or publish';
    else out.status = status;
  }
  if ('sortOrder' in body && body.sortOrder !== null) {
    const order = body.sortOrder;
    if (typeof order !== 'number' || !Number.isInteger(order) || order < 0) {
      errors.sortOrder = 'must be greater than or equal to 0';
    } else if (order > FAQ_LIMITS.maxSortOrder) {
      errors.sortOrder = 'must be less than or equal to 100000';
    } else out.sortOrder = order;
  }
  return out;
}

function matches(faq: StoredFaq, params: URLSearchParams): boolean {
  const search = params.get('search')?.trim().toLowerCase();
  if (
    search &&
    !faq.question.toLowerCase().includes(search) &&
    !faq.answer.toLowerCase().includes(search)
  ) {
    return false;
  }
  const status = params.get('status');
  if (status && faq.status !== status) return false;
  const category = params.get('category');
  return !category || faq.category === category;
}

/** `sort` (default `sortOrder,asc`), `id` asc as tiebreaker; null for an unknown field. */
function sortFaqs(rows: StoredFaq[], sort: string | null): StoredFaq[] | null {
  const [field = 'sortOrder', direction = 'asc'] = (sort ?? 'sortOrder,asc').split(',');
  const known = FAQ_SORT_FIELDS.find((value) => value === field);
  if (!known) return null;
  const factor = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = a[known];
    const right = b[known];
    if (left !== right) return (left < right ? -1 : 1) * factor;
    return a.id - b.id;
  });
}

const log = (action: string, id: number) =>
  mockDb.recordLog({ module: 'faqs', action, referenceId: id, referenceType: 'Faq' });

export const faqHandlers = [
  http.get(apiPath('/public/faq-categories'), () => HttpResponse.json(MOCK_FAQ_CATEGORIES)),

  http.get(apiPath(BASE), ({ request }) => {
    const denied = authorize(request, 'FAQ_VIEW');
    if (denied) return denied.error;
    const params = new URL(request.url).searchParams;
    const status = params.get('status');
    if (status && !oneOf(status, FAQ_STATUSES))
      return invalid({ status: 'must be draft or publish' });
    const sorted = sortFaqs(
      mockDb.faqs().filter((faq) => matches(faq, params)),
      params.get('sort'),
    );
    if (!sorted) return invalid({ sort: `must be one of ${FAQ_SORT_FIELDS.join(', ')}, id` });
    const page = Number(params.get('page') ?? 0);
    const size = Math.min(Number(params.get('size') ?? 20), 100);
    const body: PageResponse<FaqSummary> = {
      content: sorted.slice(page * size, page * size + size).map(toSummary),
      page,
      size,
      totalElements: sorted.length,
      totalPages: Math.ceil(sorted.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const denied = authorize(request, 'FAQ_VIEW');
    if (denied) return denied.error;
    const faq = mockDb.findFaq(Number(params.id));
    return faq ? HttpResponse.json(toResponse(faq)) : notFound();
  }),

  http.post(apiPath(BASE), async ({ request }) => {
    const denied = authorize(request, 'FAQ_CREATE', true);
    if (denied) return denied.error;
    const body = (await request.json()) as Body;
    const errors: Errors = {};
    const fields = validate(body, errors);
    for (const key of ['question', 'answer', 'category'] as const) {
      if (!(key in body) && !errors[key]) errors[key] = 'must not be blank';
    }
    if (Object.keys(errors).length > 0) return invalid(errors);
    if (fields.status === 'publish' && !canPublish()) return publishForbidden();
    const now = new Date().toISOString();
    const faq: StoredFaq = {
      id: mockDb.nextFaqId(),
      question: fields.question ?? '',
      answer: fields.answer ?? '',
      category: fields.category ?? '',
      status: fields.status ?? 'draft',
      sortOrder: fields.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    mockDb.saveFaq(faq);
    log('FAQ: create', faq.id);
    return HttpResponse.json(toResponse(faq), { status: 201 });
  }),

  http.patch(apiPath(`${BASE}/:id`), async ({ request, params }) => {
    const denied = authorize(request, 'FAQ_UPDATE', true);
    if (denied) return denied.error;
    const current = mockDb.findFaq(Number(params.id));
    if (!current) return notFound();
    const body = (await request.json()) as Body;
    const errors: Errors = {};
    const fields = validate(body, errors);
    if (Object.keys(errors).length > 0) return invalid(errors);
    if (fields.status !== undefined && fields.status !== current.status && !canPublish()) {
      return publishForbidden();
    }
    const saved = { ...current, ...fields, updatedAt: new Date().toISOString() };
    mockDb.saveFaq(saved);
    log('FAQ: update', saved.id);
    return HttpResponse.json(toResponse(saved));
  }),

  http.delete(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const denied = authorize(request, 'FAQ_DELETE', true);
    if (denied) return denied.error;
    const current = mockDb.findFaq(Number(params.id));
    if (!current) return notFound();
    mockDb.deleteFaq(current.id);
    log('FAQ: delete', current.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
