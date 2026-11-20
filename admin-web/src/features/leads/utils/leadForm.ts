import type { Nullable } from '@/types/common.types';

import type { LeadFormValues } from '../schemas/leadSchema';
import type { CreateLeadRequest, Lead, UpdateLeadRequest } from '../types/lead.types';

import { fromLocalInput, toLocalInput } from './leadDisplay';

/** Form fields the backend may name in a 400 `errors` map. */
export const LEAD_FORM_FIELDS = [
  'leadName',
  'phone',
  'alternatePhone',
  'email',
  'purpose',
  'source',
  'status',
  'priority',
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
] as const satisfies ReadonlyArray<keyof LeadFormValues>;

/** Server defaults (`new`, `medium`, `other`, `INR`). */
export const EMPTY_LEAD_FORM: LeadFormValues = {
  leadName: '',
  phone: '',
  alternatePhone: '',
  email: '',
  purpose: '',
  source: 'other',
  status: 'new',
  priority: 'medium',
  propertyType: '',
  bhk: '',
  budgetMin: '',
  budgetMax: '',
  budgetCurrency: 'INR',
  area: '',
  areaUnit: '',
  preferredLocation: '',
  location: '',
  possession: '',
  moveInDate: '',
  floorPreference: '',
  facing: '',
  furnishing: '',
  parking: '',
  amenities: [],
  loanRequired: false,
  additionalNote: '',
  nextFollowUpAt: '',
  lostReason: '',
  assignee: null,
};

const str = (value: Nullable<string | number> | undefined) => (value == null ? '' : String(value));

export function toLeadFormValues(lead: Lead): LeadFormValues {
  return {
    ...EMPTY_LEAD_FORM,
    leadName: lead.leadName,
    phone: lead.phone,
    alternatePhone: str(lead.alternatePhone),
    email: str(lead.email),
    purpose: lead.purpose,
    source: lead.source,
    status: lead.status,
    priority: lead.priority,
    propertyType: lead.propertyType ?? '',
    bhk: str(lead.bhk),
    budgetMin: str(lead.budgetMin),
    budgetMax: str(lead.budgetMax),
    budgetCurrency: lead.budgetCurrency,
    area: str(lead.area),
    areaUnit: lead.areaUnit ?? '',
    preferredLocation: str(lead.preferredLocation),
    location: str(lead.location),
    possession: lead.possession ?? '',
    moveInDate: str(lead.moveInDate),
    floorPreference: str(lead.floorPreference),
    facing: lead.facing ?? '',
    furnishing: lead.furnishing ?? '',
    parking: lead.parking ?? '',
    amenities: lead.amenities ?? [],
    loanRequired: lead.loanRequired,
    additionalNote: str(lead.additionalNote),
    nextFollowUpAt: toLocalInput(lead.nextFollowUpAt),
    lostReason: str(lead.lostReason),
  };
}

const orNull = <T extends string>(value: T | ''): Nullable<T> => (value === '' ? null : value);
const numberOrNull = (value: string): Nullable<number> => (value === '' ? null : Number(value));

/** Every editable field as the API expects it; empty inputs become null. */
function toFields(values: LeadFormValues): Required<UpdateLeadRequest> {
  return {
    leadName: values.leadName,
    phone: values.phone,
    alternatePhone: orNull(values.alternatePhone),
    email: orNull(values.email),
    // Required by the schema, so never '' here.
    purpose: values.purpose === '' ? 'buy' : values.purpose,
    source: values.source,
    status: values.status,
    priority: values.priority,
    propertyType: orNull(values.propertyType),
    bhk: orNull(values.bhk),
    budgetMin: numberOrNull(values.budgetMin),
    budgetMax: numberOrNull(values.budgetMax),
    budgetCurrency: values.budgetCurrency,
    area: numberOrNull(values.area),
    areaUnit: orNull(values.areaUnit),
    preferredLocation: orNull(values.preferredLocation),
    location: orNull(values.location),
    possession: orNull(values.possession),
    moveInDate: orNull(values.moveInDate),
    floorPreference: orNull(values.floorPreference),
    facing: orNull(values.facing),
    furnishing: orNull(values.furnishing),
    parking: orNull(values.parking),
    amenities: values.amenities,
    loanRequired: values.loanRequired,
    additionalNote: orNull(values.additionalNote),
    nextFollowUpAt: fromLocalInput(values.nextFollowUpAt),
    // The backend clears the reason for any status other than lost.
    lostReason: values.status === 'lost' ? orNull(values.lostReason) : null,
  };
}

/** POST body: only fields with a value, so server defaults apply to the rest. */
export function toCreateRequest(
  values: LeadFormValues,
  { includeAmenities }: { includeAmenities: boolean },
): CreateLeadRequest {
  const fields = toFields(values);
  const request: CreateLeadRequest = {
    leadName: fields.leadName,
    phone: fields.phone,
    purpose: fields.purpose,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || (Array.isArray(value) && value.length === 0)) continue;
    if (key === 'amenities' && !includeAmenities) continue;
    Object.assign(request, { [key]: value });
  }
  if (values.assignee) {
    request.assignedTo = values.assignee.id;
  }
  return request;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => item === b[index]);
  }
  return a === b;
}

/** PATCH body with only the fields that changed, so concurrent edits of other fields survive. */
export function toUpdateRequest(lead: Lead, values: LeadFormValues): UpdateLeadRequest {
  const next = toFields(values);
  const current = toFields(toLeadFormValues(lead));
  const request: UpdateLeadRequest = {};
  for (const key of LEAD_FORM_FIELDS) {
    if (!sameValue(next[key], current[key])) {
      Object.assign(request, { [key]: next[key] });
    }
  }
  return request;
}
