import { http, HttpResponse } from 'msw';

import type { AdminUser } from '@/features/auth/types/auth.types';
import {
  LEGAL_APPROVAL_STATUSES,
  type LegalApprovalStatus,
  PUBLICATION_STATUSES,
  type BuilderAccount,
  type Property,
  type PropertyActivity,
  type PropertyStats,
  type PropertySummary,
  type PublicationAction,
  type PublicationStatus,
  type StatusChangeAction,
} from '@/features/properties/types/property.types';
import type { PageResponse } from '@/types/api.types';

import { mockDb } from '../mocks/mockDb';
import { AMENITY_CATALOG, evaluateWizard, type StoredProperty } from '../mocks/propertyMockData';

import { apiPath, csrfRejection, problem } from './problem';

/** Mirrors `backend/docs/api/properties.md` (admin routes) and `PropertyPublicationService`. */

const BASE = '/admin/properties';
const SORT_FIELDS = ['createdAt', 'updatedAt', 'projectName', 'city', 'publishedAt'] as const;
type SortField = (typeof SORT_FIELDS)[number];

const TRANSITIONS: Record<
  PublicationAction,
  { from: readonly PublicationStatus[]; to: PublicationStatus; permission: string }
> = {
  submit: { from: ['draft', 'rejected'], to: 'pending_review', permission: 'PROPERTY_UPDATE_ANY' },
  approve: { from: ['pending_review'], to: 'approved', permission: 'PROPERTY_REVIEW' },
  reject: { from: ['pending_review'], to: 'rejected', permission: 'PROPERTY_REVIEW' },
  publish: { from: ['approved'], to: 'published', permission: 'PROPERTY_PUBLISH' },
  unpublish: { from: ['published'], to: 'approved', permission: 'PROPERTY_PUBLISH' },
  suspend: { from: ['approved', 'published'], to: 'suspended', permission: 'PROPERTY_SUSPEND' },
  resume: { from: ['suspended'], to: 'approved', permission: 'PROPERTY_SUSPEND' },
  archive: {
    from: ['draft', 'pending_review', 'approved', 'published', 'rejected', 'suspended'],
    to: 'archived',
    permission: 'PROPERTY_UPDATE_ANY',
  },
};
const HISTORY_ACTION: Record<PublicationAction, StatusChangeAction> = {
  submit: 'submitted',
  approve: 'approved',
  reject: 'rejected',
  publish: 'published',
  unpublish: 'unpublished',
  suspend: 'suspended',
  resume: 'resumed',
  archive: 'archived',
};

type Authorized = { error: Response } | { user: AdminUser };

/** Every route needs ADMIN_PANEL_ACCESS and PROPERTY_VIEW_ANY, plus `extra`; writes need CSRF. */
function authorize(
  request: Request,
  extra: readonly string[] = [],
  { write = false, base = 'PROPERTY_VIEW_ANY' } = {},
): Authorized {
  if (write) {
    const rejected = csrfRejection(request, mockDb.csrfToken());
    if (rejected) return { error: rejected };
  }
  const user = mockDb.sessionUser();
  if (!user) return { error: problem(401, 'unauthorized', 'Authentication required.') };
  const required = ['ADMIN_PANEL_ACCESS', base, ...extra];
  if (!required.every((permission) => user.permissions.includes(permission))) {
    return { error: problem(403, 'access_denied', 'Access denied.') };
  }
  return { user };
}

const notFound = () => problem(404, 'property_not_found', 'Property not found.');
const forbidden = () =>
  problem(403, 'property_action_forbidden', 'You are not allowed to do this.');

function toResponse(p: StoredProperty): Property {
  const { ownerId: _ownerId, ...rest } = p;
  const builder = builderAccount(p.details.builderUserId);
  return {
    ...rest,
    details: { ...rest.details, ...(builder ? { builder } : {}) },
    wizard: evaluateWizard(p),
  };
}

/** A builder account: a managed user with the builder role (any status), by id. */
function builderAccount(id: number | undefined): BuilderAccount | undefined {
  const user = id === undefined ? undefined : mockDb.findManagedUser(id);
  return user?.userType === 'builder'
    ? { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone }
    : undefined;
}

/** Mirrors `PropertyBuilderService.require`: an active builder account, else a 400 on builderUserId. */
function activeBuilder(id: unknown): BuilderAccount | Response {
  const user = typeof id === 'number' ? mockDb.findManagedUser(id) : undefined;
  return user?.userType === 'builder' && user.status === 'active'
    ? { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone }
    : problem(400, 'validation_failed', 'Validation failed', {
        errors: { builderUserId: 'must be an active user with the builder role' },
      });
}

function respond(p: StoredProperty, status = 200) {
  return HttpResponse.json(toResponse(p), { status, headers: { ETag: `"${p.version}"` } });
}

function toSummary(p: StoredProperty): PropertySummary {
  const photos = p.media.filter((m) => m.mediaType === 'photo');
  const cover = photos.find((m) => m.primary) ?? photos[0];
  const prices = p.apartments.map((a) => a.startingPrice);
  // Area of the cheapest configuration, as the backend does.
  const cheapest = [...p.apartments].sort((a, b) => a.startingPrice - b.startingPrice)[0];
  const parking = p.apartments.map((a) => a.carParking);
  const submittedAt = p.statusHistory.filter((c) => c.action === 'submitted').at(-1)?.createdAt;
  return {
    id: p.id,
    slug: p.slug,
    projectName: p.details.projectName,
    builderCompanyName: p.details.builderCompanyName,
    propertyType: p.details.propertyType,
    city: p.location.city,
    locality: p.location.locality,
    state: p.location.state,
    pincode: p.location.pincode,
    projectStatus: p.projectInfo.projectStatus,
    legalApprovalStatus: p.projectInfo.legalApprovalStatus,
    publicationStatus: p.publicationStatus,
    wizardStep: evaluateWizard(p).currentStep,
    version: p.version,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    publishedAt: p.publishedAt,
    ownerId: p.ownerId,
    ...(p.deletedAt ? { deletedAt: p.deletedAt } : {}),
    ...(prices.length ? { startingPrice: Math.min(...prices) } : {}),
    apartmentTypes: [...new Set(p.apartments.map((a) => a.apartmentType))],
    ...(cover ? { coverUrl: cover.url } : {}),
    ...(p.owner?.fullName ? { ownerName: p.owner.fullName } : {}),
    ...(p.details.reraNumber ? { reraNumber: p.details.reraNumber } : {}),
    ...(p.location.projectAddress ? { projectAddress: p.location.projectAddress } : {}),
    mediaCount: p.media.length,
    ...(cheapest?.areaMin != null
      ? { startingArea: cheapest.areaMin, startingAreaUnit: cheapest.areaUnit }
      : {}),
    ...(parking.length
      ? { carParkingMin: Math.min(...parking), carParkingMax: Math.max(...parking) }
      : {}),
    ...(submittedAt ? { submittedAt } : {}),
    ...(p.details.builderUserId ? { builderUserId: p.details.builderUserId } : {}),
    ...(builderAccount(p.details.builderUserId)
      ? { builder: builderAccount(p.details.builderUserId) }
      : {}),
  };
}

const RECENT_SUBMISSION_MS = 7 * 24 * 3_600_000;

/** A visible (not deleted) property, its version checked against If-Match. */
function editable(
  request: Request,
  id: string | readonly string[] | undefined,
  permission = 'PROPERTY_UPDATE_ANY',
) {
  const property = mockDb.findProperty(Number(id));
  if (!property || property.deletedAt) return { error: notFound() };
  const user = mockDb.sessionUser();
  if (permission && !user?.permissions.includes(permission)) return { error: forbidden() };
  const ifMatch = request.headers.get('If-Match')?.replace(/"/g, '');
  if (ifMatch && Number(ifMatch) !== property.version) {
    return {
      error: problem(
        409,
        'property_version_conflict',
        'The property was changed by someone else. Reload and try again.',
      ),
    };
  }
  if (permission === 'PROPERTY_UPDATE_ANY' && property.publicationStatus === 'archived') {
    return {
      error: problem(409, 'property_not_editable', 'Archived properties cannot be changed.'),
    };
  }
  return { property };
}

function save(
  property: StoredProperty,
  actorId: number,
  change?: Omit<Property['statusHistory'][number], 'createdAt' | 'actorUserId'>,
) {
  const now = new Date().toISOString();
  const next: StoredProperty = {
    ...property,
    version: property.version + 1,
    updatedAt: now,
    statusHistory: change
      ? [...property.statusHistory, { ...change, createdAt: now, actorUserId: actorId }]
      : property.statusHistory,
  };
  mockDb.saveProperty(next);
  return next;
}

const PINCODE = /^[1-9][0-9]{5}$/;

/** createdFrom / createdTo are ISO instants, inclusive. */
function instant(value: string | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function lower(value: string | null | undefined): string {
  return (value ?? '').toLowerCase();
}

function changeStatus(
  request: Request,
  id: string | readonly string[] | undefined,
  action: PublicationAction,
  reason?: string,
) {
  const auth = authorize(request, [], { write: true });
  if ('error' in auth) return auth.error;
  const rule = TRANSITIONS[action];
  const found = editable(request, id, '');
  if ('error' in found) return found.error;
  const { property } = found;
  if (!auth.user.permissions.includes(rule.permission)) return forbidden();
  if (property.publicationStatus === rule.to) return respond(property);
  if (!rule.from.includes(property.publicationStatus)) {
    return problem(
      409,
      'property_invalid_status_transition',
      `Cannot ${action} a property that is ${property.publicationStatus.replace('_', ' ')}.`,
    );
  }
  if ((action === 'reject' || action === 'suspend') && !reason?.trim()) {
    return problem(400, 'validation_failed', 'Validation failed', {
      errors: { reason: `is required to ${action}` },
    });
  }
  if (
    ['submit', 'approve', 'publish'].includes(action) &&
    evaluateWizard(property).currentStep !== 7
  ) {
    return problem(
      422,
      'property_incomplete',
      'The property is incomplete. Complete every step first.',
    );
  }
  const saved = save(
    {
      ...property,
      publicationStatus: rule.to,
      publishedAt: rule.to === 'published' ? new Date().toISOString() : property.publishedAt,
    },
    auth.user.id,
    {
      action: HISTORY_ACTION[action],
      fromStatus: property.publicationStatus,
      toStatus: rule.to,
      reason: reason?.trim() || null,
    },
  );
  return respond(saved);
}

export const propertyHandlers = [
  http.get(apiPath(BASE), ({ request }) => {
    const auth = authorize(request, [], { base: 'PROPERTY_LIST_ANY' });
    if ('error' in auth) return auth.error;
    const url = new URL(request.url);
    const q = url.searchParams;
    const page = Math.max(0, Number(q.get('page') ?? 0));
    const size = Math.min(100, Math.max(1, Number(q.get('size') ?? 20)));
    const [field = 'updatedAt', direction = 'desc'] = (q.get('sort') ?? 'updatedAt,desc').split(
      ',',
    );
    if (!SORT_FIELDS.includes(field as SortField)) {
      return problem(400, 'validation_failed', 'Validation failed', {
        errors: { sort: `must be one of ${SORT_FIELDS.join(', ')}` },
      });
    }
    const search = lower(q.get('search')).trim();
    const deleted = q.get('deleted') ?? 'exclude';
    const from = instant(q.get('createdFrom'));
    const to = instant(q.get('createdTo'));
    const rows = mockDb
      .properties()
      .filter((p) =>
        deleted === 'only' ? Boolean(p.deletedAt) : deleted === 'include' || !p.deletedAt,
      )
      .filter(
        (p) =>
          !search ||
          lower(p.details.projectName).includes(search) ||
          lower(p.details.builderCompanyName).includes(search) ||
          p.slug.includes(search),
      )
      .filter(
        (p) => !q.get('publicationStatus') || p.publicationStatus === q.get('publicationStatus'),
      )
      .filter((p) => !q.get('propertyType') || p.details.propertyType === q.get('propertyType'))
      .filter(
        (p) => !q.get('projectStatus') || p.projectInfo.projectStatus === q.get('projectStatus'),
      )
      .filter((p) => !q.get('city') || lower(p.location.city) === lower(q.get('city')).trim())
      .filter((p) => !q.get('state') || lower(p.location.state) === lower(q.get('state')).trim())
      .filter((p) => from === null || Date.parse(p.createdAt) >= from)
      .filter((p) => to === null || Date.parse(p.createdAt) <= to);
    const value = (p: StoredProperty): string => {
      if (field === 'projectName') return lower(p.details.projectName);
      if (field === 'city') return lower(p.location.city);
      return p[field as 'createdAt' | 'updatedAt' | 'publishedAt'] ?? '';
    };
    rows.sort((a, b) => {
      const order = value(a).localeCompare(value(b)) * (direction === 'asc' ? 1 : -1);
      return order !== 0 ? order : b.id - a.id;
    });
    const body: PageResponse<PropertySummary> = {
      content: rows.slice(page * size, page * size + size).map(toSummary),
      page,
      size,
      totalElements: rows.length,
      totalPages: Math.ceil(rows.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath(`${BASE}/stats`), ({ request }) => {
    const auth = authorize(request, [], { base: 'PROPERTY_LIST_ANY' });
    if ('error' in auth) return auth.error;
    const live = mockDb.properties().filter((p) => !p.deletedAt);
    const byPublicationStatus = Object.fromEntries(
      PUBLICATION_STATUSES.map((s) => [s, 0]),
    ) as Record<PublicationStatus, number>;
    const byLegalApprovalStatus = Object.fromEntries(
      LEGAL_APPROVAL_STATUSES.map((s) => [s, 0]),
    ) as Record<LegalApprovalStatus, number>;
    for (const p of live) {
      byPublicationStatus[p.publicationStatus] += 1;
      byLegalApprovalStatus[p.projectInfo.legalApprovalStatus] += 1;
    }
    const body: PropertyStats = {
      total: live.length,
      byPublicationStatus,
      byLegalApprovalStatus,
      deleted: mockDb.properties().length - live.length,
      submittedLast7Days: mockDb
        .properties()
        .filter((p) =>
          p.statusHistory.some(
            (c) =>
              c.action === 'submitted' &&
              Date.now() - Date.parse(c.createdAt) <= RECENT_SUBMISSION_MS,
          ),
        ).length,
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath(`${BASE}/activity`), ({ request }) => {
    const auth = authorize(request, [], { base: 'PROPERTY_LIST_ANY' });
    if ('error' in auth) return auth.error;
    const q = new URL(request.url).searchParams;
    const page = Math.max(0, Number(q.get('page') ?? 0));
    const size = Math.min(Math.max(1, Number(q.get('size') ?? 10)), 100);
    let id = 0;
    const all: PropertyActivity[] = mockDb
      .properties()
      .flatMap((p) =>
        p.statusHistory.map((c) => ({
          id: ++id,
          propertyId: p.id,
          projectName: p.details.projectName,
          action: c.action,
          fromStatus: c.fromStatus,
          toStatus: c.toStatus,
          reason: c.reason,
          actorName:
            c.actorUserId === undefined
              ? null
              : (mockDb.findManagedUser(c.actorUserId)?.fullName ?? null),
          createdAt: c.createdAt,
        })),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
    const body: PageResponse<PropertyActivity> = {
      content: all.slice(page * size, page * size + size),
      page,
      size,
      totalElements: all.length,
      totalPages: Math.ceil(all.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath(`${BASE}/amenities`), ({ request }) => {
    const auth = authorize(request);
    if ('error' in auth) return auth.error;
    return HttpResponse.json(AMENITY_CATALOG);
  }),

  http.post(apiPath(BASE), async ({ request }) => {
    const auth = authorize(request, ['PROPERTY_CREATE'], { write: true });
    if ('error' in auth) return auth.error;
    const key = request.headers.get('Idempotency-Key');
    const existing = key ? mockDb.createdWithKey(`${auth.user.id}:${key}`) : undefined;
    if (existing) {
      const found = mockDb.findProperty(existing);
      if (found) return respond(found);
    }
    const { builderUserId, builderCompanyName, ...body } = (await request.json()) as Omit<
      Property['details'],
      'builderCompanyName'
    > & { builderCompanyName?: string };
    let builderName = builderCompanyName?.trim() ?? '';
    if (builderUserId !== undefined) {
      const linked = activeBuilder(builderUserId);
      if (linked instanceof Response) return linked;
      builderName = linked.fullName;
    }
    if (!builderName) {
      return problem(400, 'validation_failed', 'Validation failed', {
        errors: { builderCompanyName: 'must not be blank' },
      });
    }
    if (body.projectName?.toLowerCase().includes('duplicate')) {
      return problem(400, 'validation_failed', 'Validation failed', {
        errors: { projectName: 'is already used by another project' },
      });
    }
    const id = mockDb.nextId('property');
    const now = new Date().toISOString();
    const created: StoredProperty = {
      id,
      slug: body.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      version: 1,
      publicationStatus: 'draft',
      ownerId: auth.user.id,
      owner: {
        id: auth.user.id,
        fullName: auth.user.fullName,
        email: auth.user.email,
        phone: auth.user.phone,
      },
      details: {
        ...body,
        builderCompanyName: builderName,
        ...(builderUserId !== undefined ? { builderUserId } : {}),
        reraNumber: body.reraNumber ?? null,
        gstNumber: body.gstNumber ?? null,
      },
      location: {
        projectAddress: null,
        city: null,
        locality: null,
        pincode: null,
        state: null,
        landmark: null,
        latitude: null,
        longitude: null,
      },
      apartments: [],
      projectInfo: {
        totalTowersBlocks: null,
        totalUnitsFlats: null,
        projectStatus: 'upcoming',
        legalApprovalStatus: 'pending',
        landArea: null,
        landAreaUnit: null,
        possessionStartDate: null,
        possessionEndDate: null,
        projectDescription: null,
        projectHighlights: [],
      },
      amenities: [],
      media: [],
      threeDTourUrl: null,
      nearbyPlaces: [],
      statusHistory: [
        {
          action: 'created',
          fromStatus: null,
          toStatus: 'draft',
          reason: null,
          createdAt: now,
          actorUserId: auth.user.id,
        },
      ],
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    };
    mockDb.saveProperty(created);
    if (key) mockDb.rememberCreateKey(`${auth.user.id}:${key}`, id);
    return respond(created, 201);
  }),

  http.get(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const auth = authorize(request);
    if ('error' in auth) return auth.error;
    const property = mockDb.findProperty(Number(params.id));
    return property && !property.deletedAt ? respond(property) : notFound();
  }),

  http.get(apiPath(`${BASE}/:id/preview`), ({ request, params }) => {
    const auth = authorize(request);
    if ('error' in auth) return auth.error;
    const property = mockDb.findProperty(Number(params.id));
    return property && !property.deletedAt ? respond(property) : notFound();
  }),

  http.get(apiPath(`${BASE}/:id/wizard`), ({ request, params }) => {
    const auth = authorize(request);
    if ('error' in auth) return auth.error;
    const property = mockDb.findProperty(Number(params.id));
    return property && !property.deletedAt
      ? HttpResponse.json(evaluateWizard(property))
      : notFound();
  }),

  http.patch(apiPath(`${BASE}/:id/steps/:step`), async ({ request, params }) => {
    const auth = authorize(request, [], { write: true });
    if ('error' in auth) return auth.error;
    const found = editable(request, params.id);
    if ('error' in found) return found.error;
    const body = (await request.json()) as Record<string, unknown>;
    const { property } = found;
    if (params.step === '1') {
      const { builderUserId, ...fields } = body;
      const details: Property['details'] = { ...property.details, ...fields };
      if (typeof fields.builderCompanyName === 'string') delete details.builderUserId;
      if (builderUserId === null) delete details.builderUserId;
      if (builderUserId !== undefined && builderUserId !== null) {
        const linked = activeBuilder(builderUserId);
        if (linked instanceof Response) return linked;
        details.builderUserId = linked.id;
        details.builderCompanyName = linked.fullName;
      }
      delete details.builder;
      return respond(save({ ...property, details }, auth.user.id));
    }
    if (params.step === '2') {
      if (typeof body.pincode === 'string' && !PINCODE.test(body.pincode)) {
        return problem(400, 'validation_failed', 'Validation failed', {
          errors: { pincode: 'must be a 6-digit PIN code' },
        });
      }
      return respond(
        save({ ...property, location: { ...property.location, ...body } }, auth.user.id),
      );
    }
    if (params.step === '4') {
      return respond(
        save({ ...property, projectInfo: { ...property.projectInfo, ...body } }, auth.user.id),
      );
    }
    if (params.step === '6') {
      return respond(
        save(
          { ...property, threeDTourUrl: (body.threeDTourUrl as string | null) ?? null },
          auth.user.id,
        ),
      );
    }
    return notFound();
  }),

  http.put(apiPath(`${BASE}/:id/apartments`), async ({ request, params }) => {
    const auth = authorize(request, [], { write: true });
    if ('error' in auth) return auth.error;
    const found = editable(request, params.id);
    if ('error' in found) return found.error;
    const { apartments } = (await request.json()) as { apartments: Array<Record<string, unknown>> };
    const now = new Date().toISOString();
    const next = apartments.map((a, index) => ({
      currency: 'INR',
      description: null,
      balconies: 0,
      carParking: 0,
      carpetArea: null,
      balconyArea: null,
      builtUpArea: null,
      superBuiltUpArea: null,
      areaUnit: 'sq_ft',
      highlights: [],
      amenities: [],
      media: [],
      createdAt: now,
      ...a,
      id: typeof a.id === 'number' ? a.id : mockDb.nextId('apartment'),
      displayOrder: index,
      updatedAt: now,
    })) as unknown as Property['apartments'];
    return respond(save({ ...found.property, apartments: next }, auth.user.id));
  }),

  http.put(apiPath(`${BASE}/:id/amenities`), async ({ request, params }) => {
    const auth = authorize(request, [], { write: true });
    if ('error' in auth) return auth.error;
    const found = editable(request, params.id);
    if ('error' in found) return found.error;
    const { amenityIds } = (await request.json()) as { amenityIds: number[] };
    const amenities = AMENITY_CATALOG.filter((a) => amenityIds.includes(a.id));
    return respond(save({ ...found.property, amenities }, auth.user.id));
  }),

  http.put(apiPath(`${BASE}/:id/nearby-places`), async ({ request, params }) => {
    const auth = authorize(request, [], { write: true });
    if ('error' in auth) return auth.error;
    const found = editable(request, params.id);
    if ('error' in found) return found.error;
    const { places } = (await request.json()) as {
      places: Array<
        Omit<Property['nearbyPlaces'][number], 'id' | 'distanceSource' | 'latitude' | 'longitude'>
      >;
    };
    const nearbyPlaces = places.map((p) => ({
      ...p,
      id: mockDb.nextId('place'),
      distanceSource: 'manual',
      latitude: null,
      longitude: null,
    }));
    return respond(save({ ...found.property, nearbyPlaces }, auth.user.id));
  }),

  http.post(apiPath(`${BASE}/:id/media`), async ({ request, params }) => {
    const auth = authorize(request, [], { write: true });
    if ('error' in auth) return auth.error;
    const found = editable(request, params.id);
    if ('error' in found) return found.error;
    const { property } = found;
    const id = mockDb.nextId('media');
    const now = new Date().toISOString();
    let media: Property['media'][number];
    if (request.headers.get('Content-Type')?.includes('application/json')) {
      const body = (await request.json()) as { url: string; title?: string };
      media = {
        id,
        mediaType: 'video',
        url: body.url,
        external: true,
        mimeType: null,
        fileSize: null,
        originalFilename: null,
        title: body.title ?? null,
        description: null,
        sortOrder: property.media.length,
        primary: false,
        createdAt: now,
      };
    } else {
      const form = await request.formData();
      const file = form.get('file');
      const rawType = form.get('mediaType');
      const mediaType = typeof rawType === 'string' ? rawType : 'photo';
      const isFirstPhoto =
        mediaType === 'photo' && !property.media.some((m) => m.mediaType === 'photo');
      media = {
        id,
        mediaType,
        url: `/api/v1${BASE}/${property.id}/media/${id}/content`,
        external: false,
        mimeType: file instanceof File ? file.type : null,
        fileSize: file instanceof File ? file.size : null,
        originalFilename: file instanceof File ? file.name : null,
        title: (form.get('title') as string | null) ?? null,
        description: null,
        sortOrder: property.media.length,
        primary: isFirstPhoto,
        createdAt: now,
      };
    }
    return respond(save({ ...property, media: [...property.media, media] }, auth.user.id), 201);
  }),

  http.patch(apiPath(`${BASE}/:id/media/:mediaId`), async ({ request, params }) => {
    const auth = authorize(request, [], { write: true });
    if ('error' in auth) return auth.error;
    const found = editable(request, params.id);
    if ('error' in found) return found.error;
    const body = (await request.json()) as { primary?: boolean };
    const mediaId = Number(params.mediaId);
    if (!found.property.media.some((m) => m.id === mediaId))
      return problem(404, 'media_not_found', 'Media not found.');
    const media = found.property.media.map((m) => ({
      ...m,
      primary: body.primary && m.mediaType === 'photo' ? m.id === mediaId : m.primary,
    }));
    return respond(save({ ...found.property, media }, auth.user.id));
  }),

  http.delete(apiPath(`${BASE}/:id/media/:mediaId`), ({ request, params }) => {
    const auth = authorize(request, [], { write: true });
    if ('error' in auth) return auth.error;
    const found = editable(request, params.id);
    if ('error' in found) return found.error;
    const media = found.property.media.filter((m) => m.id !== Number(params.mediaId));
    return respond(save({ ...found.property, media }, auth.user.id));
  }),

  // A 1x1 PNG, so thumbnails render in `dev:mock`.
  http.get(apiPath(`${BASE}/:id/media/:mediaId/content`), () =>
    HttpResponse.arrayBuffer(
      Uint8Array.from(
        atob(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN89+JFPQAI2gNMEzrfVAAAAABJRU5ErkJggg==',
        ),
        (c) => c.charCodeAt(0),
      ).buffer,
      { headers: { 'Content-Type': 'image/png' } },
    ),
  ),

  http.post(apiPath(`${BASE}/:id/submit`), ({ request, params }) =>
    changeStatus(request, params.id, 'submit'),
  ),
  http.post(apiPath(`${BASE}/:id/publish`), ({ request, params }) =>
    changeStatus(request, params.id, 'publish'),
  ),
  http.patch(apiPath(`${BASE}/:id/status`), async ({ request, params }) => {
    const body = (await request.json()) as { action: PublicationAction; reason?: string };
    return changeStatus(request, params.id, body.action, body.reason);
  }),

  http.patch(apiPath(`${BASE}/:id/legal-status`), async ({ request, params }) => {
    const auth = authorize(request, ['PROPERTY_LEGAL_REVIEW'], { write: true });
    if ('error' in auth) return auth.error;
    const found = editable(request, params.id, '');
    if ('error' in found) return found.error;
    const body = (await request.json()) as { status: LegalApprovalStatus; reason?: string };
    if (body.status === 'rejected' && !body.reason?.trim()) {
      return problem(400, 'validation_failed', 'Validation failed', {
        errors: { reason: 'is required to reject the legal approval' },
      });
    }
    const { property } = found;
    if (property.projectInfo.legalApprovalStatus === body.status) return respond(property);
    return respond(
      save(
        { ...property, projectInfo: { ...property.projectInfo, legalApprovalStatus: body.status } },
        auth.user.id,
        {
          action: 'legal_status_changed',
          fromStatus: property.projectInfo.legalApprovalStatus,
          toStatus: body.status,
          reason: body.reason?.trim() || null,
        },
      ),
    );
  }),

  http.delete(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const auth = authorize(request, ['PROPERTY_DELETE_ANY'], { write: true });
    if ('error' in auth) return auth.error;
    const found = editable(request, params.id, 'PROPERTY_DELETE_ANY');
    if ('error' in found) return found.error;
    mockDb.saveProperty({ ...found.property, deletedAt: new Date().toISOString() });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(apiPath(`${BASE}/:id/restore`), ({ request, params }) => {
    const auth = authorize(request, ['PROPERTY_RESTORE_ANY'], {
      write: true,
      base: 'ADMIN_PANEL_ACCESS',
    });
    if ('error' in auth) return auth.error;
    const property = mockDb.findProperty(Number(params.id));
    if (!property) return notFound();
    if (!property.deletedAt)
      return problem(409, 'property_not_deleted', 'The property is not deleted.');
    const { deletedAt: _deletedAt, ...restored } = property;
    return respond(
      save(restored, auth.user.id, {
        action: 'restored',
        fromStatus: property.publicationStatus,
        toStatus: property.publicationStatus,
        reason: null,
      }),
    );
  }),
];
