import { http, HttpResponse } from 'msw';

import type { AdminUser } from '@/features/auth/types/auth.types';
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type Lead,
  type LeadStats,
  type LeadSummary,
} from '@/features/leads/types/lead.types';
import type { PageResponse } from '@/types/api.types';

import { mockDb } from '../mocks/mockDb';

import { apiPath, csrfRejection, problem } from './problem';

/** Mirrors `backend/docs/api/leads.md` (admin routes) and `LeadService`. */

const BASE = '/admin/leads';
const SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'leadName',
  'status',
  'nextFollowUpAt',
  'lastContactedAt',
  'budgetMax',
] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const READ_ONLY = ['id', 'createdBy', 'createdAt', 'updatedAt', 'lastContactedAt', 'deletedAt'];

type Authorized = { error: Response } | { user: AdminUser };

/** ADMIN_PANEL_ACCESS plus every permission in `required` (when given); writes need CSRF. */
function authorize(request: Request, required: readonly string[] = [], write = false): Authorized {
  if (write) {
    const rejected = csrfRejection(request, mockDb.csrfToken());
    if (rejected) return { error: rejected };
  }
  const user = mockDb.sessionUser();
  if (!user) return { error: problem(401, 'unauthorized', 'Authentication required.') };
  if (![...required, 'ADMIN_PANEL_ACCESS'].every((p) => user.permissions.includes(p))) {
    return { error: problem(403, 'access_denied', 'Access denied.') };
  }
  return { user };
}

const notFound = () => problem(404, 'lead_not_found', 'Lead not found.');
const forbidden = () => problem(403, 'lead_action_forbidden', 'You are not allowed to do this.');
const invalid = (errors: Record<string, string>) =>
  problem(400, 'validation_failed', 'Validation failed', { errors });

const has = (user: AdminUser, permission: string) => user.permissions.includes(permission);
const isOwn = (user: AdminUser, lead: Lead) => lead.createdBy.id === user.id;

/** A lead the user may see (own, or any with LEAD_VIEW_ANY); others are 404. */
function visible(user: AdminUser, id: string | readonly string[] | undefined): Lead | undefined {
  const lead = mockDb.findLead(Number(id));
  if (!lead) return undefined;
  return has(user, 'LEAD_VIEW_ANY') || (has(user, 'LEAD_VIEW') && isOwn(user, lead))
    ? lead
    : undefined;
}

function toSummary(lead: Lead): LeadSummary {
  const {
    alternatePhone: _a,
    area: _b,
    areaUnit: _c,
    location: _d,
    possession: _e,
    moveInDate: _f,
    floorPreference: _g,
    facing: _h,
    furnishing: _i,
    parking: _j,
    amenities: _k,
    loanRequired: _l,
    additionalNote: _m,
    lostReason: _n,
    ...summary
  } = lead;
  return summary;
}

/** Same idea as `PhoneNumberNormalizer` (default region India): 10 digits get +91. */
function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+'))
    return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+91${digits}`;
  return null;
}

/** Only active accounts whose role can view every lead are eligible in the mock. */
function assignee(id: unknown): { id: number; fullName: string } | null {
  const user = typeof id === 'number' ? mockDb.findManagedUser(id) : undefined;
  const role = user ? mockDb.findRole(user.userType) : undefined;
  if (
    !user ||
    user.status !== 'active' ||
    !role?.active ||
    !role.permissions.includes('LEAD_VIEW_ANY')
  ) {
    return null;
  }
  return { id: user.id, fullName: user.fullName };
}

type Body = Record<string, unknown>;

/** Applies a create/PATCH body to a lead; returns field errors (backend messages) when invalid. */
function apply(lead: Lead, body: Body): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of READ_ONLY) {
    if (field in body) errors[field] = 'is not allowed';
  }
  if ('leadName' in body) {
    const name = typeof body.leadName === 'string' ? body.leadName.trim() : '';
    if (!name) errors.leadName = 'must not be blank';
    else lead.leadName = name;
  }
  for (const field of ['phone', 'alternatePhone'] as const) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (field === 'alternatePhone' && (raw === null || raw === '')) {
      lead.alternatePhone = null;
      continue;
    }
    const phone = normalizePhone(raw);
    if (!phone) errors[field] = 'must be a valid phone number';
    else lead[field] = phone;
  }
  if ('email' in body) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
    if (email && !EMAIL.test(email)) errors.email = 'must be a well-formed email address';
    else lead.email = email || null;
  }
  // Remaining fields are trusted in the mock (the client validates them) and copied as sent.
  const copied: Array<keyof Lead> = [
    'source',
    'status',
    'priority',
    'purpose',
    'propertyType',
    'bhk',
    'budgetMin',
    'budgetMax',
    'budgetCurrency',
    'area',
    'areaUnit',
    'preferredLocation',
    'location',
    'possession',
    'moveInDate',
    'floorPreference',
    'facing',
    'furnishing',
    'parking',
    'amenities',
    'loanRequired',
    'additionalNote',
    'nextFollowUpAt',
    'lostReason',
  ];
  for (const field of copied) {
    if (field in body) Object.assign(lead, { [field]: body[field] });
  }
  if (lead.budgetMin != null && lead.budgetMax != null && lead.budgetMax < lead.budgetMin) {
    errors.budgetMax = 'must not be less than budgetMin';
  }
  if (lead.area != null && !lead.areaUnit) errors.areaUnit = 'is required when area is set';
  if (lead.status !== 'lost') lead.lostReason = null;
  if (lead.status === 'lost' && !lead.lostReason)
    errors.lostReason = 'is required when status is lost';
  return errors;
}

function compare(a: Lead, b: Lead, field: (typeof SORT_FIELDS)[number]): number {
  const left = a[field];
  const right = b[field];
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left < right ? -1 : 1;
}

function matches(lead: Lead, params: URLSearchParams): boolean {
  const search = params.get('search')?.trim().toLowerCase();
  if (search) {
    const digits = search.replace(/\D/g, '');
    const hit =
      lead.leadName.toLowerCase().includes(search) ||
      (lead.email ?? '').includes(search) ||
      (digits.length >= 3 && lead.phone.includes(digits));
    if (!hit) return false;
  }
  for (const field of ['status', 'priority', 'source', 'purpose', 'propertyType'] as const) {
    const value = params.get(field);
    if (value && lead[field] !== value) return false;
  }
  const assignedTo = params.get('assignedTo');
  if (assignedTo && lead.assignedTo?.id !== Number(assignedTo)) return false;
  const location = params.get('preferredLocation')?.toLowerCase();
  if (location && !(lead.preferredLocation ?? '').toLowerCase().includes(location)) return false;
  const from = params.get('createdFrom');
  if (from && lead.createdAt < from) return false;
  const to = params.get('createdTo');
  if (to && lead.createdAt > to) return false;
  return true;
}

export const leadHandlers = [
  http.get(apiPath(`${BASE}/stats`), ({ request }) => {
    const auth = authorize(request, ['LEAD_LIST_ANY']);
    if ('error' in auth) return auth.error;
    const leads = mockDb.leads();
    const stats: LeadStats = {
      total: leads.length,
      byStatus: Object.fromEntries(
        LEAD_STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length]),
      ) as LeadStats['byStatus'],
      bySource: Object.fromEntries(
        LEAD_SOURCES.map((s) => [s, leads.filter((l) => l.source === s).length]),
      ) as LeadStats['bySource'],
    };
    return HttpResponse.json(stats);
  }),

  http.get(apiPath(BASE), ({ request }) => {
    const auth = authorize(request, ['LEAD_LIST_ANY']);
    if ('error' in auth) return auth.error;
    const params = new URL(request.url).searchParams;
    const [sortField = 'createdAt', direction = 'desc'] = (
      params.get('sort') ?? 'createdAt,desc'
    ).split(',');
    const field = SORT_FIELDS.find((f) => f === sortField);
    if (!field) return invalid({ sort: 'must be one of ' + SORT_FIELDS.join(', ') });
    const from = params.get('createdFrom');
    const to = params.get('createdTo');
    if (from && to && to < from)
      return invalid({ createdTo: 'must not be before the start of the range' });
    const page = Number(params.get('page') ?? 0);
    const size = Math.min(Number(params.get('size') ?? 20), 100);
    const rows = mockDb
      .leads()
      .filter((lead) => matches(lead, params))
      .sort((a, b) => compare(a, b, field) * (direction === 'asc' ? 1 : -1));
    const body: PageResponse<LeadSummary> = {
      content: rows.slice(page * size, page * size + size).map(toSummary),
      page,
      size,
      totalElements: rows.length,
      totalPages: Math.ceil(rows.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const auth = authorize(request);
    if ('error' in auth) return auth.error;
    const lead = visible(auth.user, params.id);
    return lead ? HttpResponse.json(lead) : notFound();
  }),

  http.post(apiPath(BASE), async ({ request }) => {
    const auth = authorize(request, ['LEAD_CREATE'], true);
    if ('error' in auth) return auth.error;
    const body = (await request.json()) as Body;
    const now = new Date().toISOString();
    const lead: Lead = {
      id: mockDb.nextLeadId(),
      createdBy: { id: auth.user.id, fullName: auth.user.fullName },
      assignedTo: null,
      source: 'other',
      status: 'new',
      priority: 'medium',
      purpose: 'buy',
      leadName: '',
      phone: '',
      alternatePhone: null,
      email: null,
      propertyType: null,
      bhk: null,
      budgetMin: null,
      budgetMax: null,
      budgetCurrency: 'INR',
      area: null,
      areaUnit: null,
      preferredLocation: null,
      location: null,
      possession: null,
      moveInDate: null,
      floorPreference: null,
      facing: null,
      furnishing: null,
      parking: null,
      amenities: [],
      loanRequired: false,
      additionalNote: null,
      lastContactedAt: null,
      nextFollowUpAt: null,
      lostReason: null,
      createdAt: now,
      updatedAt: now,
    };
    const { assignedTo, ...fields } = body;
    const errors = apply(lead, fields);
    if (!('leadName' in body)) errors.leadName = 'must not be blank';
    if (!('phone' in body)) errors.phone = 'must not be blank';
    if (!('purpose' in body)) errors.purpose = 'must not be null';
    if (assignedTo !== undefined && assignedTo !== null) {
      if (!has(auth.user, 'LEAD_ASSIGN')) return forbidden();
      const target = assignee(assignedTo);
      if (!target) errors.assignedTo = 'must be an active user who can work on this lead';
      else lead.assignedTo = target;
    }
    if (Object.keys(errors).length) return invalid(errors);
    mockDb.saveLead(lead);
    return HttpResponse.json(lead, { status: 201 });
  }),

  http.patch(apiPath(`${BASE}/:id/assign`), async ({ request, params }) => {
    const auth = authorize(request, [], true);
    if ('error' in auth) return auth.error;
    const lead = visible(auth.user, params.id);
    if (!lead) return notFound();
    if (!has(auth.user, 'LEAD_ASSIGN')) return forbidden();
    const { assignedTo } = (await request.json()) as Body;
    let next: Lead['assignedTo'] = null;
    if (assignedTo !== null) {
      next = assignee(assignedTo);
      if (!next) return invalid({ assignedTo: 'must be an active user who can work on this lead' });
    }
    const saved = { ...lead, assignedTo: next, updatedAt: new Date().toISOString() };
    mockDb.saveLead(saved);
    return HttpResponse.json(saved);
  }),

  http.patch(apiPath(`${BASE}/:id`), async ({ request, params }) => {
    const auth = authorize(request, [], true);
    if ('error' in auth) return auth.error;
    const lead = visible(auth.user, params.id);
    if (!lead) return notFound();
    if (
      !has(auth.user, 'LEAD_UPDATE_ANY') &&
      !(has(auth.user, 'LEAD_UPDATE') && isOwn(auth.user, lead))
    ) {
      return forbidden();
    }
    const body = (await request.json()) as Body;
    if ('assignedTo' in body) return invalid({ assignedTo: 'is not allowed' });
    const draft: Lead = { ...lead, amenities: lead.amenities ? [...lead.amenities] : null };
    const errors = apply(draft, body);
    if (lead.status === 'converted' && draft.status !== 'converted') {
      return problem(409, 'lead_invalid_status_transition', 'A converted lead keeps its status.');
    }
    if (Object.keys(errors).length) return invalid(errors);
    const saved = { ...draft, updatedAt: new Date().toISOString() };
    mockDb.saveLead(saved);
    return HttpResponse.json(saved);
  }),

  http.delete(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const auth = authorize(request, [], true);
    if ('error' in auth) return auth.error;
    const lead = visible(auth.user, params.id);
    if (!lead) return notFound();
    if (
      !has(auth.user, 'LEAD_DELETE_ANY') &&
      !(has(auth.user, 'LEAD_DELETE') && isOwn(auth.user, lead))
    ) {
      return forbidden();
    }
    mockDb.deleteLead(lead.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
