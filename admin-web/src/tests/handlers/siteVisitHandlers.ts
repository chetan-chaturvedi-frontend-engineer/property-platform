import { http, HttpResponse } from 'msw';

import type { AdminUser } from '@/features/auth/types/auth.types';
import {
  REQUESTABLE_STATUSES,
  SITE_VISIT_INTERESTS,
  SITE_VISIT_STATUSES,
  SITE_VISIT_TYPES,
  type SiteVisit,
  type SiteVisitStats,
  type SiteVisitSummary,
  UPCOMING_STATUSES,
} from '@/features/siteVisits/types/siteVisit.types';
import { isDue, scheduleError } from '@/features/siteVisits/utils/siteVisitDisplay';
import type { PageResponse } from '@/types/api.types';

import { mockDb } from '../mocks/mockDb';

import { apiPath, csrfRejection, problem } from './problem';

/** Mirrors `backend/docs/api/site-visits.md` (admin routes) and `SiteVisitService`. */

const BASE = '/admin/site-visits';
const SORT_FIELDS = ['visitDate', 'createdAt', 'updatedAt', 'nextFollowUp', 'status'] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPDATE_FIELDS = [
  'visitType',
  'visitDate',
  'visitTime',
  'name',
  'mobile',
  'email',
  'numberOfPeople',
  'note',
  'nextFollowUp',
  'followUpNote',
  'userId',
  'leadId',
];
/** Fields that change only while the visit is upcoming. */
const DETAIL_FIELDS = [
  'visitType',
  'visitDate',
  'visitTime',
  'name',
  'mobile',
  'email',
  'numberOfPeople',
  'note',
  'userId',
];

type Authorized = { error: Response } | { user: AdminUser };
type Body = Record<string, unknown>;

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
  return { user };
}

const notFound = () => problem(404, 'site_visit_not_found', 'Site visit not found.');
const invalid = (errors: Record<string, string>) =>
  problem(400, 'validation_failed', 'Validation failed', { errors });
const conflict = (code: string, detail: string) => problem(409, code, detail);
const isUpcoming = (visit: SiteVisit) => UPCOMING_STATUSES.includes(visit.status);

function toSummary(visit: SiteVisit): SiteVisitSummary {
  const {
    assignedAt: _a,
    scheduledBy: _b,
    leadId: _c,
    email: _d,
    note: _e,
    actualVisitDate: _f,
    cancelledAt: _g,
    cancellationReason: _h,
    report,
    followUpNote: _i,
    ...summary
  } = visit;
  return { ...summary, interest: report?.interest ?? null };
}

/** Same idea as `PhoneNumberNormalizer` (default region India): 10 digits get +91. */
function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+')) {
    return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
  }
  return digits.length === 10 ? `+91${digits}` : null;
}

function userRef(id: unknown): { id: number; fullName: string } | null {
  const user = typeof id === 'number' ? mockDb.findManagedUser(id) : undefined;
  return user && user.status === 'active' ? { id: user.id, fullName: user.fullName } : null;
}

/** Active, and the role can view every visit (the mock has no field-agent roles). */
function assignee(id: unknown): { id: number; fullName: string } | null {
  const user = typeof id === 'number' ? mockDb.findManagedUser(id) : undefined;
  const role = user ? mockDb.findRole(user.userType) : undefined;
  if (!user || user.status !== 'active' || !role?.active) return null;
  return role.permissions.includes('SITE_VISIT_VIEW_ANY')
    ? { id: user.id, fullName: user.fullName }
    : null;
}

/** Applies visitor/schedule fields; returns field errors with the backend's messages. */
function applyFields(visit: SiteVisit, body: Body, isNew: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) errors.name = 'must not be blank';
    else visit.name = name;
  }
  if ('mobile' in body) {
    const mobile = normalizePhone(body.mobile);
    if (!mobile) errors.mobile = 'must be a valid phone number';
    else visit.mobile = mobile;
  }
  if ('email' in body) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
    if (email && !EMAIL.test(email)) errors.email = 'must be a well-formed email address';
    else visit.email = email || null;
  }
  if ('visitType' in body) {
    const type = SITE_VISIT_TYPES.find((t) => t === body.visitType);
    if (!type) errors.visitType = 'must be one of the allowed values';
    else visit.visitType = type;
  }
  if ('numberOfPeople' in body) {
    const people = body.numberOfPeople;
    if (typeof people !== 'number' || people < 1 || people > 100) {
      errors.numberOfPeople = 'must be between 1 and 100';
    } else {
      visit.numberOfPeople = people;
    }
  }
  if ('note' in body) visit.note = typeof body.note === 'string' ? body.note : null;
  if ('followUpNote' in body) {
    visit.followUpNote = typeof body.followUpNote === 'string' ? body.followUpNote : null;
  }
  if ('nextFollowUp' in body) {
    visit.nextFollowUp = typeof body.nextFollowUp === 'string' ? body.nextFollowUp : null;
  }
  const moved = 'visitDate' in body || 'visitTime' in body;
  if (typeof body.visitDate === 'string') visit.visitDate = body.visitDate;
  if (typeof body.visitTime === 'string') {
    visit.visitTime = body.visitTime.length === 5 ? `${body.visitTime}:00` : body.visitTime;
  }
  if (isNew || moved) {
    const error = scheduleError(visit.visitDate, visit.visitTime);
    if (error) errors[error.field] = error.message;
  }
  if ('userId' in body) {
    if (body.userId === null) visit.customer = null;
    else {
      const customer = userRef(body.userId);
      if (!customer) errors.userId = 'must be an active user';
      else visit.customer = customer;
    }
  }
  if ('leadId' in body) {
    if (body.leadId === null) visit.leadId = null;
    else if (typeof body.leadId === 'number' && mockDb.findLead(body.leadId)) {
      visit.leadId = body.leadId;
    } else {
      errors.leadId = 'must be a lead you can view';
    }
  }
  return errors;
}

function compare(a: SiteVisit, b: SiteVisit, field: (typeof SORT_FIELDS)[number]): number {
  const key = (visit: SiteVisit) =>
    field === 'visitDate' ? `${visit.visitDate}T${visit.visitTime}` : visit[field];
  const left = key(a);
  const right = key(b);
  if (left === right) return b.id - a.id;
  if (left === null) return 1;
  if (right === null) return -1;
  return left < right ? -1 : 1;
}

function matches(visit: SiteVisit, params: URLSearchParams): boolean {
  const search = params.get('search')?.trim().toLowerCase();
  if (search) {
    const digits = search.replace(/\D/g, '');
    const hit =
      visit.name.toLowerCase().includes(search) ||
      (visit.email ?? '').includes(search) ||
      visit.visitCode.toLowerCase().includes(search) ||
      (digits.length >= 3 && visit.mobile.includes(digits));
    if (!hit) return false;
  }
  for (const [param, value] of [
    ['status', visit.status],
    ['visitType', visit.visitType],
    ['interest', visit.report?.interest ?? null],
  ] as const) {
    const wanted = params.get(param);
    if (wanted && value !== wanted) return false;
  }
  for (const [param, value] of [
    ['propertyId', visit.property.id],
    ['assignId', visit.assignee?.id],
    ['userId', visit.customer?.id],
    ['leadId', visit.leadId],
    ['builderId', visit.builder.id],
  ] as const) {
    const wanted = params.get(param);
    if (wanted && value !== Number(wanted)) return false;
  }
  const from = params.get('visitDateFrom');
  if (from && visit.visitDate < from) return false;
  const to = params.get('visitDateTo');
  if (to && visit.visitDate > to) return false;
  return true;
}

function filterErrors(params: URLSearchParams): Record<string, string> {
  const errors: Record<string, string> = {};
  const enums: Array<[string, readonly string[]]> = [
    ['status', SITE_VISIT_STATUSES],
    ['visitType', SITE_VISIT_TYPES],
    ['interest', SITE_VISIT_INTERESTS],
  ];
  for (const [param, allowed] of enums) {
    const value = params.get(param);
    if (value && !allowed.includes(value)) errors[param] = 'must be one of the allowed values';
  }
  return errors;
}

export const siteVisitHandlers = [
  http.get(apiPath(`${BASE}/stats`), ({ request }) => {
    const auth = authorize(request, 'SITE_VISIT_LIST_ANY');
    if ('error' in auth) return auth.error;
    const visits = mockDb.siteVisits();
    const count = <T extends string>(values: readonly T[], read: (v: SiteVisit) => T) =>
      Object.fromEntries(
        values.map((value) => [value, visits.filter((v) => read(v) === value).length]),
      );
    const stats: SiteVisitStats = {
      total: visits.length,
      byStatus: count(SITE_VISIT_STATUSES, (v) => v.status) as SiteVisitStats['byStatus'],
      byVisitType: count(SITE_VISIT_TYPES, (v) => v.visitType) as SiteVisitStats['byVisitType'],
    };
    return HttpResponse.json(stats);
  }),

  http.get(apiPath(BASE), ({ request }) => {
    const auth = authorize(request, 'SITE_VISIT_LIST_ANY');
    if ('error' in auth) return auth.error;
    const params = new URL(request.url).searchParams;
    const [sortField = 'visitDate', direction = 'desc'] = (
      params.get('sort') ?? 'visitDate,desc'
    ).split(',');
    const field = SORT_FIELDS.find((f) => f === sortField);
    if (!field) return invalid({ sort: 'must be one of ' + SORT_FIELDS.join(', ') });
    const errors = filterErrors(params);
    if (Object.keys(errors).length) return invalid(errors);
    const page = Number(params.get('page') ?? 0);
    const size = Math.min(Number(params.get('size') ?? 20), 100);
    const rows = mockDb
      .siteVisits()
      .filter((visit) => matches(visit, params))
      .sort((a, b) => compare(a, b, field) * (direction === 'asc' ? 1 : -1));
    const body: PageResponse<SiteVisitSummary> = {
      content: rows.slice(page * size, page * size + size).map(toSummary),
      page,
      size,
      totalElements: rows.length,
      totalPages: Math.ceil(rows.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const auth = authorize(request, 'SITE_VISIT_VIEW_ANY');
    if ('error' in auth) return auth.error;
    const visit = mockDb.findSiteVisit(Number(params.id));
    return visit ? HttpResponse.json(visit) : notFound();
  }),

  http.post(apiPath(BASE), async ({ request }) => {
    const auth = authorize(request, 'SITE_VISIT_CREATE_ANY', true);
    if ('error' in auth) return auth.error;
    const body = (await request.json()) as Body;
    const property =
      typeof body.propertyId === 'number' ? mockDb.findProperty(body.propertyId) : undefined;
    const now = new Date().toISOString();
    const id = mockDb.nextSiteVisitId();
    const visit: SiteVisit = {
      id,
      visitCode: `SV-${100000 + id}`,
      property: {
        id: property?.id ?? 0,
        projectName: property?.details.projectName ?? null,
        slug: property?.slug ?? null,
        city: property?.location.city ?? null,
        locality: property?.location.locality ?? null,
      },
      builder: { id: property?.ownerId ?? 0, fullName: property?.owner?.fullName ?? null },
      customer: null,
      assignee: null,
      assignedAt: null,
      scheduledBy: { id: auth.user.id, fullName: auth.user.fullName },
      leadId: null,
      visitType: 'site_visit',
      visitDate: typeof body.visitDate === 'string' ? body.visitDate : '',
      visitTime: '',
      status: 'scheduled',
      name: '',
      mobile: '',
      email: null,
      numberOfPeople: 1,
      note: null,
      actualVisitDate: null,
      cancelledAt: null,
      cancellationReason: null,
      report: null,
      nextFollowUp: null,
      followUpNote: null,
      createdAt: now,
      updatedAt: now,
    };
    const { propertyId: _p, assignId, ...fields } = body;
    const errors = applyFields(visit, fields, true);
    if (!property || property.deletedAt) errors.propertyId = 'must be an existing property';
    for (const required of ['visitDate', 'visitTime', 'name', 'mobile']) {
      if (!(required in body)) errors[required] = 'must not be null';
    }
    if (assignId !== undefined && assignId !== null) {
      if (!auth.user.permissions.includes('SITE_VISIT_ASSIGN_ANY')) {
        return problem(403, 'site_visit_action_forbidden', 'You are not allowed to do this.');
      }
      const agent = assignee(assignId);
      if (!agent) errors.assignId = 'must be an active user who can work on site visits';
      else {
        visit.assignee = agent;
        visit.assignedAt = now;
      }
    }
    if (Object.keys(errors).length) return invalid(errors);
    mockDb.saveSiteVisit(visit);
    return HttpResponse.json(visit, { status: 201 });
  }),

  http.patch(apiPath(`${BASE}/:id/assign`), async ({ request, params }) => {
    const auth = authorize(request, 'SITE_VISIT_ASSIGN_ANY', true);
    if ('error' in auth) return auth.error;
    const visit = mockDb.findSiteVisit(Number(params.id));
    if (!visit) return notFound();
    if (!isUpcoming(visit) && visit.status !== 'completed') {
      return conflict('site_visit_not_editable', 'This visit can no longer be assigned.');
    }
    const { assignId } = (await request.json()) as Body;
    const agent = assignId === null ? null : assignee(assignId);
    if (assignId !== null && !agent) {
      return invalid({ assignId: 'must be an active user who can work on site visits' });
    }
    const now = new Date().toISOString();
    const saved = { ...visit, assignee: agent, assignedAt: agent ? now : null, updatedAt: now };
    mockDb.saveSiteVisit(saved);
    return HttpResponse.json(saved);
  }),

  http.patch(apiPath(`${BASE}/:id/status`), async ({ request, params }) => {
    const auth = authorize(request, 'SITE_VISIT_UPDATE_STATUS_ANY', true);
    if ('error' in auth) return auth.error;
    const visit = mockDb.findSiteVisit(Number(params.id));
    if (!visit) return notFound();
    const body = (await request.json()) as Body;
    const next = REQUESTABLE_STATUSES.find((s) => s === body.status);
    if (!next) return invalid({ status: 'must be one of the allowed values' });
    if (!isUpcoming(visit) || next === visit.status) {
      return conflict('site_visit_invalid_status_transition', 'This status change is not allowed.');
    }
    const reason =
      typeof body.cancellationReason === 'string' ? body.cancellationReason.trim() : '';
    if (next === 'cancelled' && !reason) {
      return invalid({ cancellationReason: 'is required when cancelling' });
    }
    if ((next === 'completed' || next === 'no_show') && !isDue(visit.visitDate, visit.visitTime)) {
      return conflict('site_visit_not_due', 'The visit date has not been reached yet.');
    }
    const now = new Date().toISOString();
    const saved: SiteVisit = {
      ...visit,
      status: next,
      cancellationReason: next === 'cancelled' ? reason : visit.cancellationReason,
      cancelledAt: next === 'cancelled' ? now : visit.cancelledAt,
      actualVisitDate:
        next === 'completed'
          ? typeof body.actualVisitDate === 'string'
            ? body.actualVisitDate
            : now
          : visit.actualVisitDate,
      updatedAt: now,
    };
    mockDb.saveSiteVisit(saved);
    return HttpResponse.json(saved);
  }),

  http.post(apiPath(`${BASE}/:id/report`), async ({ request, params }) => {
    const auth = authorize(request, 'SITE_VISIT_SUBMIT_REPORT_ANY', true);
    if ('error' in auth) return auth.error;
    const visit = mockDb.findSiteVisit(Number(params.id));
    if (!visit) return notFound();
    if (visit.status !== 'completed') {
      return conflict('site_visit_report_not_allowed', 'Only completed visits get a report.');
    }
    const body = (await request.json()) as Body;
    const interest = SITE_VISIT_INTERESTS.find((value) => value === body.interest);
    if (!interest) return invalid({ interest: 'must not be null' });
    const text = (key: string) => {
      const value = body[key];
      return typeof value === 'string' ? value : null;
    };
    const num = (key: string) => {
      const value = body[key];
      return typeof value === 'number' ? value : null;
    };
    const saved: SiteVisit = {
      ...visit,
      report: {
        interest,
        visitNote: text('visitNote'),
        duration: num('duration'),
        visitedWith: text('visitedWith'),
        feedback: text('feedback'),
        rating: num('rating'),
        submittedBy: { id: auth.user.id, fullName: auth.user.fullName },
      },
      nextFollowUp: text('nextFollowUp'),
      followUpNote: text('followUpNote'),
      updatedAt: new Date().toISOString(),
    };
    mockDb.saveSiteVisit(saved);
    return HttpResponse.json(saved);
  }),

  http.patch(apiPath(`${BASE}/:id`), async ({ request, params }) => {
    const auth = authorize(request, 'SITE_VISIT_UPDATE_ANY', true);
    if ('error' in auth) return auth.error;
    const visit = mockDb.findSiteVisit(Number(params.id));
    if (!visit) return notFound();
    const body = (await request.json()) as Body;
    const unknown = Object.keys(body).filter((key) => !UPDATE_FIELDS.includes(key));
    if (unknown.length)
      return invalid(Object.fromEntries(unknown.map((key) => [key, 'is not allowed'])));
    if (!isUpcoming(visit) && Object.keys(body).some((key) => DETAIL_FIELDS.includes(key))) {
      return conflict('site_visit_not_editable', 'Visit details change only while it is upcoming.');
    }
    const draft: SiteVisit = { ...visit };
    const errors = applyFields(draft, body, false);
    if (Object.keys(errors).length) return invalid(errors);
    const moved = draft.visitDate !== visit.visitDate || draft.visitTime !== visit.visitTime;
    const saved: SiteVisit = {
      ...draft,
      status: moved ? 'rescheduled' : draft.status,
      updatedAt: new Date().toISOString(),
    };
    mockDb.saveSiteVisit(saved);
    return HttpResponse.json(saved);
  }),

  http.delete(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const auth = authorize(request, 'SITE_VISIT_DELETE_ANY', true);
    if ('error' in auth) return auth.error;
    const visit = mockDb.findSiteVisit(Number(params.id));
    if (!visit) return notFound();
    mockDb.deleteSiteVisit(visit.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
