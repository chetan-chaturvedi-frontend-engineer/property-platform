import type { BadgeTone } from '@/components/common/Badge';
import { PERMISSIONS } from '@/utils/constants';

import type { WorkflowTarget } from '../components/WorkflowActionDialog';
import type {
  ApartmentType,
  AreaUnit,
  LegalApprovalStatus,
  NearbyPlaceType,
  ProjectStatus,
  Property,
  PropertyType,
  PublicationAction,
  PublicationStatus,
} from '../types/property.types';

/**
 * Table and detail badges. Approved green, pending yellow, rejected red (as agreed for the list);
 * published is teal so live listings stand apart from approved-but-unpublished ones.
 */
export const PUBLICATION_STATUS_META: Record<
  PublicationStatus,
  { label: string; tone: BadgeTone }
> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending_review: { label: 'Pending review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  published: { label: 'Published', tone: 'secondary' },
  rejected: { label: 'Rejected', tone: 'error' },
  suspended: { label: 'Suspended', tone: 'errorStrong' },
  archived: { label: 'Archived', tone: 'neutral' },
};

export const LEGAL_STATUS_META: Record<LegalApprovalStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Legal pending', tone: 'warning' },
  approved: { label: 'Legal approved', tone: 'success' },
  rejected: { label: 'Legal rejected', tone: 'error' },
  not_applicable: { label: 'Legal N/A', tone: 'neutral' },
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment',
  villa: 'Villa',
  commercial: 'Commercial',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  upcoming: 'Upcoming',
  under_construction: 'Under construction',
  ready_to_move: 'Ready to move',
  completed: 'Completed',
  on_hold: 'On hold',
  cancelled: 'Cancelled',
};

export const APARTMENT_TYPE_LABELS: Record<ApartmentType, string> = {
  '1bhk': '1 BHK',
  '2bhk': '2 BHK',
  '3bhk': '3 BHK',
  '4bhk': '4 BHK',
  penthouse: 'Penthouse',
};

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  sq_ft: 'sq.ft',
  sq_m: 'sq.m',
  acre: 'acres',
  hectare: 'hectares',
};

export const NEARBY_PLACE_LABELS: Record<NearbyPlaceType, string> = {
  school: 'School',
  hospital: 'Hospital',
  shopping_mall: 'Shopping mall',
  metro_station: 'Metro station',
  railway_station: 'Railway station',
  airport: 'Airport',
  bus_stop: 'Bus stop',
  other: 'Other',
};

const LAKH = 100_000;
const CRORE = 10_000_000;
const compact = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** Indian price notation: ₹85.5 Lacs, ₹1.2 Cr. Other currencies use the locale's format. */
export function formatPrice(value: number | null | undefined, currency = 'INR'): string {
  if (value == null) {
    return '—';
  }
  if (currency !== 'INR') {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  }
  if (value >= CRORE) {
    return `₹${compact.format(value / CRORE)} Cr`;
  }
  if (value >= LAKH) {
    return `₹${compact.format(value / LAKH)} Lacs`;
  }
  return `₹${compact.format(value)}`;
}

/** "Baner, Pune" from whichever parts are set. */
export function formatPlace(parts: Array<string | null | undefined>): string {
  const present = parts.filter((part): part is string => Boolean(part?.trim()));
  return present.length ? present.join(', ') : '—';
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

/** "projectAddress" -> "Project address" for the wizard's missing-field lists. */
export function fieldLabel(field: string): string {
  const words = field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Mirrors `PublicationAction` in the backend: where each action may start. */
const ALLOWED_FROM: Record<PublicationAction, readonly PublicationStatus[]> = {
  submit: ['draft', 'rejected'],
  approve: ['pending_review'],
  reject: ['pending_review'],
  publish: ['approved'],
  unpublish: ['published'],
  suspend: ['approved', 'published'],
  resume: ['suspended'],
  archive: ['draft', 'pending_review', 'approved', 'published', 'rejected', 'suspended'],
};

/** Who may perform each action (admin dashboard: the `_ANY` and workflow permissions). */
const ACTION_PERMISSION: Record<PublicationAction, string> = {
  submit: PERMISSIONS.propertyUpdateAny,
  approve: PERMISSIONS.propertyReview,
  reject: PERMISSIONS.propertyReview,
  publish: PERMISSIONS.propertyPublish,
  unpublish: PERMISSIONS.propertyPublish,
  suspend: PERMISSIONS.propertySuspend,
  resume: PERMISSIONS.propertySuspend,
  archive: PERMISSIONS.propertyUpdateAny,
};

export const ACTIONS_NEEDING_REASON: readonly PublicationAction[] = ['reject', 'suspend'];

export const ACTION_META: Record<
  PublicationAction,
  { label: string; description: string; destructive?: boolean }
> = {
  submit: { label: 'Submit for review', description: 'Send the property to the review queue.' },
  approve: { label: 'Approve', description: 'Approve the listing. Publishing is a separate step.' },
  reject: {
    label: 'Reject',
    description: 'Send the listing back to the owner. The reason is shown to them.',
    destructive: true,
  },
  publish: { label: 'Publish', description: 'Make the listing visible to all users.' },
  unpublish: { label: 'Unpublish', description: 'Hide the listing; it stays approved.' },
  suspend: {
    label: 'Suspend',
    description: 'Take the listing down. The reason is shown to the owner.',
    destructive: true,
  },
  resume: { label: 'Resume', description: 'Lift the suspension. Publish again afterwards.' },
  archive: {
    label: 'Archive',
    description: 'Retire the listing for good. It becomes read-only and never public again.',
    destructive: true,
  },
};

/** Workflow actions that apply to the status and that the viewer holds the permission for. */
export function availableActions(
  status: PublicationStatus,
  can: (permission: string) => boolean,
): PublicationAction[] {
  return (Object.keys(ALLOWED_FROM) as PublicationAction[]).filter(
    (action) => ALLOWED_FROM[action].includes(status) && can(ACTION_PERMISSION[action]),
  );
}

/** Admins with `PROPERTY_UPDATE_ANY` may edit in every status except archived. */
export function isEditable(status: PublicationStatus): boolean {
  return status !== 'archived';
}

/** The primary photo, else the first photo. */
export function coverOf(property: Property) {
  const photos = property.media.filter((m) => m.mediaType === 'photo');
  return photos.find((m) => m.primary) ?? photos[0];
}

/** Lowest and highest starting price across the configurations. */
export function priceRange(property: Property): string {
  const prices = property.apartments.map((a) => a.startingPrice);
  if (prices.length === 0) {
    return '—';
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
}

export function toWorkflowTarget(property: Property): WorkflowTarget {
  return {
    id: property.id,
    version: property.version,
    projectName: property.details.projectName,
    legalApprovalStatus: property.projectInfo.legalApprovalStatus,
  };
}

/** Parses the `:id` route segment; anything but a positive integer is not a property. */
export function parsePropertyId(raw: string | undefined): number | null {
  if (!raw || !/^\d{1,15}$/.test(raw)) {
    return null;
  }
  const id = Number(raw);
  return id > 0 ? id : null;
}

const SQ_FT_PER_SQ_M = 10.763_910_4;

/** An apartment area in square feet; `null` when missing, not positive or in another unit. */
export function areaInSqFt(area: number | null | undefined, unit: AreaUnit | null | undefined) {
  if (area == null || !Number.isFinite(area) || area <= 0) {
    return null;
  }
  if (unit === 'sq_ft' || unit == null) {
    return area;
  }
  return unit === 'sq_m' ? area * SQ_FT_PER_SQ_M : null;
}

/**
 * Total price ÷ area in sq.ft, rounded to whole rupees. `null` when either value is missing or invalid, so
 * callers never show a figure computed from a zero or unknown area.
 */
export function pricePerSqFt(
  price: number | null | undefined,
  area: number | null | undefined,
  unit: AreaUnit | null | undefined,
): number | null {
  const sqFt = areaInSqFt(area, unit);
  if (price == null || !Number.isFinite(price) || price < 0 || sqFt === null) {
    return null;
  }
  return Math.round(price / sqFt);
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const wholeFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Full rupee amount with Indian digit grouping: ₹1,25,00,000. */
export function formatInr(value: number | null | undefined): string {
  return value == null ? '—' : inrFormatter.format(value);
}

export function formatSqFt(value: number | null | undefined): string {
  return value == null ? '—' : `${wholeFormatter.format(value)} sq.ft`;
}

/** "1 parking", "1–2 parking" or "No parking"; `null` when unknown. */
export function formatParking(min: number | undefined, max: number | undefined): string | null {
  if (min === undefined || max === undefined) {
    return null;
  }
  if (max === 0) {
    return 'No parking';
  }
  return min === max ? `${min} parking` : `${min}–${max} parking`;
}

export function formatApartmentTypes(types: readonly ApartmentType[] | undefined): string {
  return types?.length ? types.map((type) => APARTMENT_TYPE_LABELS[type]).join(', ') : '';
}

const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

/** Date and time on separate lines, in the viewer's time zone (API instants are UTC). */
export function formatDateAndTime(
  value: string | null | undefined,
): { date: string; time: string } | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return { date: dateFormatter.format(parsed), time: timeFormatter.format(parsed) };
}
