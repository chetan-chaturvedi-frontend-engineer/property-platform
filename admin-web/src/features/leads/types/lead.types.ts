import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

/** Enums of `backend/docs/api/leads.md` (lowercase values, as sent and received). */
export const LEAD_STATUSES = [
  'new',
  'contacted',
  'interested',
  'qualified',
  'site_visit_scheduled',
  'negotiation',
  'converted',
  'lost',
  'on_hold',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  'website',
  'facebook',
  'instagram',
  'referral',
  'walk_in',
  'phone_call',
  'other',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const LEAD_PURPOSES = ['buy', 'rent', 'lease', 'sell'] as const;
export type LeadPurpose = (typeof LEAD_PURPOSES)[number];

export const LEAD_PROPERTY_TYPES = [
  'apartment',
  'flat',
  'villa',
  'independent_house',
  'plot',
  'commercial',
  'office',
  'shop',
  'other',
] as const;
export type LeadPropertyType = (typeof LEAD_PROPERTY_TYPES)[number];

export const AREA_UNITS = ['sq_ft', 'sq_m', 'acre', 'hectare'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

export const POSSESSION_TIMELINES = [
  'ready_to_move',
  'within_3_months',
  'within_6_months',
  'within_1_year',
  'after_1_year',
  'flexible',
] as const;
export type PossessionTimeline = (typeof POSSESSION_TIMELINES)[number];

export const FACINGS = [
  'north',
  'south',
  'east',
  'west',
  'north_east',
  'north_west',
  'south_east',
  'south_west',
] as const;
export type Facing = (typeof FACINGS)[number];

export const FURNISHINGS = ['furnished', 'semi_furnished', 'unfurnished'] as const;
export type Furnishing = (typeof FURNISHINGS)[number];

export const PARKING_PREFERENCES = ['not_required', 'two_wheeler', 'four_wheeler', 'both'] as const;
export type ParkingPreference = (typeof PARKING_PREFERENCES)[number];

/** Creator or assignee: the name only, never contact details. `fullName` is null for deleted users. */
export interface LeadUserRef {
  id: EntityId;
  fullName: Nullable<string>;
}

/** `GET /admin/leads` item. */
export interface LeadSummary {
  id: EntityId;
  createdBy: LeadUserRef;
  assignedTo: Nullable<LeadUserRef>;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  purpose: LeadPurpose;
  leadName: string;
  /** E.164. */
  phone: string;
  email: Nullable<string>;
  propertyType: Nullable<LeadPropertyType>;
  bhk: Nullable<string>;
  budgetMin: Nullable<number>;
  budgetMax: Nullable<number>;
  budgetCurrency: string;
  preferredLocation: Nullable<string>;
  lastContactedAt: Nullable<IsoDateTime>;
  nextFollowUpAt: Nullable<IsoDateTime>;
  createdAt: IsoDateTime;
  updatedAt: Nullable<IsoDateTime>;
}

/** `GET /admin/leads/{id}` and every write response. */
export interface Lead extends LeadSummary {
  alternatePhone: Nullable<string>;
  area: Nullable<number>;
  areaUnit: Nullable<AreaUnit>;
  /** Where the customer is now. */
  location: Nullable<string>;
  possession: Nullable<PossessionTimeline>;
  /** `yyyy-MM-dd`. */
  moveInDate: Nullable<string>;
  floorPreference: Nullable<string>;
  facing: Nullable<Facing>;
  furnishing: Nullable<Furnishing>;
  parking: Nullable<ParkingPreference>;
  /** Amenity slugs from the catalog. */
  amenities: Nullable<string[]>;
  loanRequired: boolean;
  additionalNote: Nullable<string>;
  lostReason: Nullable<string>;
}

export type LeadSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'leadName'
  | 'status'
  | 'nextFollowUpAt'
  | 'lastContactedAt'
  | 'budgetMax';

export interface LeadFilters extends PageParams {
  /** Name or email substring, or 3+ phone digits. */
  search?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: LeadSource;
  purpose?: LeadPurpose;
  propertyType?: LeadPropertyType;
  assignedTo?: EntityId;
  preferredLocation?: string;
  /** Inclusive ISO instants. */
  createdFrom?: IsoDateTime;
  createdTo?: IsoDateTime;
}

/** `GET /admin/leads/stats`: every status and source is a key. */
export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  bySource: Record<LeadSource, number>;
}

/** Editable fields shared by create and update. */
interface LeadFields {
  leadName: string;
  phone: string;
  alternatePhone: Nullable<string>;
  email: Nullable<string>;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  purpose: LeadPurpose;
  propertyType: Nullable<LeadPropertyType>;
  bhk: Nullable<string>;
  budgetMin: Nullable<number>;
  budgetMax: Nullable<number>;
  budgetCurrency: string;
  area: Nullable<number>;
  areaUnit: Nullable<AreaUnit>;
  preferredLocation: Nullable<string>;
  location: Nullable<string>;
  possession: Nullable<PossessionTimeline>;
  moveInDate: Nullable<string>;
  floorPreference: Nullable<string>;
  facing: Nullable<Facing>;
  furnishing: Nullable<Furnishing>;
  parking: Nullable<ParkingPreference>;
  amenities: string[];
  loanRequired: boolean;
  additionalNote: Nullable<string>;
  nextFollowUpAt: Nullable<IsoDateTime>;
  lostReason: Nullable<string>;
}

/** `POST /admin/leads`. `assignedTo` needs `LEAD_ASSIGN`. */
export type CreateLeadRequest = Partial<LeadFields> &
  Pick<LeadFields, 'leadName' | 'phone' | 'purpose'> & { assignedTo?: EntityId };

/** `PATCH /admin/leads/{id}`: omitted fields keep their value, `null` clears optional ones. */
export type UpdateLeadRequest = Partial<LeadFields>;

/** `PATCH /admin/leads/{id}/assign`; `null` unassigns. */
export interface AssignLeadRequest {
  assignedTo: Nullable<EntityId>;
}

/** An account offered as assignee, from `GET /admin/users`. */
export interface AssigneeOption {
  id: EntityId;
  fullName: string;
  email: string;
}

/** A selected assignee; filters restored from the URL may only know the id and name. */
export type AssigneeValue = Pick<AssigneeOption, 'id' | 'fullName'> & { email?: string };

/** `GET /admin/properties/amenities` item; leads store the slug. */
export interface AmenityOption {
  id: EntityId;
  name: string;
  slug: string;
}
