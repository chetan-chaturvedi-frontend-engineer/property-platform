import type { PickerOption } from '@/components/common/SearchAutocomplete';
import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

/** Enums of `backend/docs/api/site-visits.md` (lowercase values, as sent and received). */
export const SITE_VISIT_STATUSES = [
  'scheduled',
  'confirmed',
  'rescheduled',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type SiteVisitStatus = (typeof SITE_VISIT_STATUSES)[number];

/** Statuses a status change may request; `rescheduled` follows from moving the date or time. */
export const REQUESTABLE_STATUSES = ['confirmed', 'completed', 'cancelled', 'no_show'] as const;
export type RequestableStatus = (typeof REQUESTABLE_STATUSES)[number];

/** The visit has not happened yet; only these can change status or be edited in full. */
export const UPCOMING_STATUSES: readonly SiteVisitStatus[] = [
  'scheduled',
  'confirmed',
  'rescheduled',
];

export const SITE_VISIT_TYPES = ['site_visit', 'virtual_visit', 'revisit'] as const;
export type SiteVisitType = (typeof SITE_VISIT_TYPES)[number];

export const SITE_VISIT_INTERESTS = ['high', 'medium', 'low', 'not_interested'] as const;
export type SiteVisitInterest = (typeof SITE_VISIT_INTERESTS)[number];

/** A referenced account: the name only, never contact details. `fullName` is null for deleted users. */
export interface SiteVisitUserRef {
  id: EntityId;
  fullName: Nullable<string>;
}

/** The visited property; the names are null when the property no longer exists. */
export interface SiteVisitProperty {
  id: EntityId;
  projectName: Nullable<string>;
  slug: Nullable<string>;
  city: Nullable<string>;
  locality: Nullable<string>;
}

/** `GET /admin/site-visits` item. */
export interface SiteVisitSummary {
  id: EntityId;
  /** e.g. `SV-100012`. */
  visitCode: string;
  property: SiteVisitProperty;
  builder: SiteVisitUserRef;
  customer: Nullable<SiteVisitUserRef>;
  assignee: Nullable<SiteVisitUserRef>;
  visitType: SiteVisitType;
  /** `yyyy-MM-dd`, wall-clock date at the property (not UTC). */
  visitDate: string;
  /** `HH:mm:ss`, wall-clock time at the property. */
  visitTime: string;
  status: SiteVisitStatus;
  name: string;
  /** E.164. */
  mobile: string;
  numberOfPeople: number;
  interest: Nullable<SiteVisitInterest>;
  nextFollowUp: Nullable<IsoDateTime>;
  createdAt: IsoDateTime;
  updatedAt: Nullable<IsoDateTime>;
}

export interface SiteVisitReport {
  interest: SiteVisitInterest;
  visitNote: Nullable<string>;
  /** Minutes. */
  duration: Nullable<number>;
  visitedWith: Nullable<string>;
  feedback: Nullable<string>;
  rating: Nullable<number>;
  submittedBy: Nullable<SiteVisitUserRef>;
}

/** `GET /admin/site-visits/{id}` and every write response. */
export interface SiteVisit extends Omit<SiteVisitSummary, 'interest'> {
  assignedAt: Nullable<IsoDateTime>;
  scheduledBy: Nullable<SiteVisitUserRef>;
  leadId: Nullable<EntityId>;
  email: Nullable<string>;
  note: Nullable<string>;
  actualVisitDate: Nullable<IsoDateTime>;
  cancelledAt: Nullable<IsoDateTime>;
  cancellationReason: Nullable<string>;
  report: Nullable<SiteVisitReport>;
  followUpNote: Nullable<string>;
}

export type SiteVisitSortField =
  'visitDate' | 'createdAt' | 'updatedAt' | 'nextFollowUp' | 'status';

export interface SiteVisitFilters extends PageParams {
  /** Visitor name, email, 3+ mobile digits or the visit code. */
  search?: string;
  propertyId?: EntityId;
  assignId?: EntityId;
  userId?: EntityId;
  leadId?: EntityId;
  status?: SiteVisitStatus;
  visitType?: SiteVisitType;
  interest?: SiteVisitInterest;
  /** Inclusive `yyyy-MM-dd`. */
  visitDateFrom?: string;
  visitDateTo?: string;
}

/** `GET /admin/site-visits/stats`: every status and type is a key. */
export interface SiteVisitStats {
  total: number;
  byStatus: Record<SiteVisitStatus, number>;
  byVisitType: Record<SiteVisitType, number>;
}

/** `POST /admin/site-visits`. `assignId` also needs `SITE_VISIT_ASSIGN_ANY`. */
export interface CreateSiteVisitRequest {
  propertyId: EntityId;
  userId?: EntityId;
  assignId?: EntityId;
  leadId?: EntityId;
  visitType?: SiteVisitType;
  visitDate: string;
  /** `HH:mm`. */
  visitTime: string;
  name: string;
  mobile: string;
  email?: string;
  numberOfPeople?: number;
  note?: string;
  nextFollowUp?: IsoDateTime;
  followUpNote?: string;
}

/** `PATCH /admin/site-visits/{id}`: omitted fields keep their value, `null` clears optional ones. */
export interface UpdateSiteVisitRequest {
  visitType?: SiteVisitType;
  visitDate?: string;
  visitTime?: string;
  name?: string;
  mobile?: string;
  email?: Nullable<string>;
  numberOfPeople?: number;
  note?: Nullable<string>;
  nextFollowUp?: Nullable<IsoDateTime>;
  followUpNote?: Nullable<string>;
  userId?: Nullable<EntityId>;
  leadId?: Nullable<EntityId>;
}

/** `PATCH /admin/site-visits/{id}/status`. */
export interface SiteVisitStatusRequest {
  status: RequestableStatus;
  /** `completed` only; not in the future. Defaults to now. */
  actualVisitDate?: IsoDateTime;
  /** Required for `cancelled`, not allowed otherwise. */
  cancellationReason?: string;
}

/** `POST /admin/site-visits/{id}/report`: replaces the whole report. */
export interface SiteVisitReportRequest {
  interest: SiteVisitInterest;
  visitNote?: string;
  duration?: number;
  visitedWith?: string;
  feedback?: string;
  rating?: number;
  nextFollowUp?: IsoDateTime;
  followUpNote?: string;
}

export type { PickerOption } from '@/components/common/SearchAutocomplete';

/** A lead offered when linking a visit; its contact details prefill the visitor fields. */
export interface LeadPickerOption extends PickerOption {
  phone: string;
  email: Nullable<string>;
}
