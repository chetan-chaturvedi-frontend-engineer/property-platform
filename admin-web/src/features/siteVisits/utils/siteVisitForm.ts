import type { Path } from 'react-hook-form';

import type { SiteVisitFormValues, SiteVisitReportValues } from '../schemas/siteVisitSchema';
import type {
  CreateSiteVisitRequest,
  SiteVisit,
  SiteVisitReportRequest,
  UpdateSiteVisitRequest,
} from '../types/siteVisit.types';

import { fromLocalInput, propertyNow, shortTime, toLocalInput, userName } from './siteVisitDisplay';

/** Form fields the API reports errors for under the same name. */
export const SITE_VISIT_FORM_FIELDS: readonly Path<SiteVisitFormValues>[] = [
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
];

/** API field -> form field, for errors on the picked references. */
export const SITE_VISIT_REFERENCE_FIELDS: Record<string, Path<SiteVisitFormValues>> = {
  propertyId: 'property',
  leadId: 'lead',
  userId: 'customer',
  assignId: 'agent',
};

export function emptySiteVisitForm(now: Date = new Date()): SiteVisitFormValues {
  return {
    property: null,
    lead: null,
    customer: null,
    agent: null,
    visitType: 'site_visit',
    visitDate: propertyNow(now).date,
    visitTime: '',
    name: '',
    mobile: '',
    email: '',
    numberOfPeople: '1',
    note: '',
    nextFollowUp: '',
    followUpNote: '',
  };
}

export function toSiteVisitFormValues(visit: SiteVisit): SiteVisitFormValues {
  return {
    property: { id: visit.property.id, label: visit.property.projectName ?? 'Deleted property' },
    lead: visit.leadId ? { id: visit.leadId, label: `LID-${visit.leadId}` } : null,
    customer: visit.customer ? { id: visit.customer.id, label: userName(visit.customer) } : null,
    agent: visit.assignee ? { id: visit.assignee.id, label: userName(visit.assignee) } : null,
    visitType: visit.visitType,
    visitDate: visit.visitDate,
    visitTime: shortTime(visit.visitTime),
    name: visit.name,
    mobile: visit.mobile,
    email: visit.email ?? '',
    numberOfPeople: String(visit.numberOfPeople),
    note: visit.note ?? '',
    nextFollowUp: toLocalInput(visit.nextFollowUp),
    followUpNote: visit.followUpNote ?? '',
  };
}

const orUndefined = (value: string) => value.trim() || undefined;
const orNull = (value: string) => value.trim() || null;

export function toCreateRequest(
  values: SiteVisitFormValues,
  { includeAgent }: { includeAgent: boolean },
): CreateSiteVisitRequest {
  return {
    propertyId: values.property?.id ?? 0,
    leadId: values.lead?.id,
    userId: values.customer?.id,
    assignId: includeAgent ? values.agent?.id : undefined,
    visitType: values.visitType,
    visitDate: values.visitDate,
    visitTime: shortTime(values.visitTime),
    name: values.name.trim(),
    mobile: values.mobile.trim(),
    email: orUndefined(values.email),
    numberOfPeople: Number(values.numberOfPeople),
    note: orUndefined(values.note),
    nextFollowUp: fromLocalInput(values.nextFollowUp) ?? undefined,
    followUpNote: orUndefined(values.followUpNote),
  };
}

/**
 * Only the fields that changed, so a visit that is no longer upcoming can still get follow-up edits
 * (sending unchanged visit details would be rejected with 409 `site_visit_not_editable`).
 */
export function toUpdateRequest(
  visit: SiteVisit,
  values: SiteVisitFormValues,
): UpdateSiteVisitRequest {
  const original = toSiteVisitFormValues(visit);
  const request: UpdateSiteVisitRequest = {};
  if (values.visitType !== original.visitType) request.visitType = values.visitType;
  if (values.visitDate !== original.visitDate) request.visitDate = values.visitDate;
  if (shortTime(values.visitTime) !== original.visitTime) {
    request.visitTime = shortTime(values.visitTime);
  }
  if (values.name.trim() !== original.name) request.name = values.name.trim();
  if (values.mobile.trim() !== original.mobile) request.mobile = values.mobile.trim();
  if (values.email.trim() !== original.email) request.email = orNull(values.email);
  if (values.numberOfPeople.trim() !== original.numberOfPeople) {
    request.numberOfPeople = Number(values.numberOfPeople);
  }
  if (values.note.trim() !== original.note) request.note = orNull(values.note);
  if (values.nextFollowUp !== original.nextFollowUp) {
    request.nextFollowUp = fromLocalInput(values.nextFollowUp);
  }
  if (values.followUpNote.trim() !== original.followUpNote) {
    request.followUpNote = orNull(values.followUpNote);
  }
  if ((values.customer?.id ?? null) !== (visit.customer?.id ?? null)) {
    request.userId = values.customer?.id ?? null;
  }
  if ((values.lead?.id ?? null) !== visit.leadId) request.leadId = values.lead?.id ?? null;
  return request;
}

export function toReportValues(visit: SiteVisit): SiteVisitReportValues {
  const report = visit.report;
  return {
    interest: report?.interest ?? '',
    visitNote: report?.visitNote ?? '',
    duration: report?.duration ? String(report.duration) : '',
    visitedWith: report?.visitedWith ?? '',
    feedback: report?.feedback ?? '',
    rating: report?.rating ?? null,
    nextFollowUp: toLocalInput(visit.nextFollowUp),
    followUpNote: visit.followUpNote ?? '',
  };
}

export function toReportRequest(values: SiteVisitReportValues): SiteVisitReportRequest {
  // The schema rejects ''; this only narrows the type.
  if (values.interest === '') throw new Error('The interest level is required.');
  return {
    interest: values.interest,
    visitNote: orUndefined(values.visitNote),
    duration: values.duration ? Number(values.duration) : undefined,
    visitedWith: orUndefined(values.visitedWith),
    feedback: orUndefined(values.feedback),
    rating: values.rating ?? undefined,
    nextFollowUp: fromLocalInput(values.nextFollowUp) ?? undefined,
    followUpNote: orUndefined(values.followUpNote),
  };
}
