import { type CsvColumn, toCsv } from '@/utils/csv';

import type { Property, PropertySummary } from '../types/property.types';

import {
  areaInSqFt,
  formatApartmentTypes,
  formatParking,
  LEGAL_STATUS_META,
  pricePerSqFt,
  PROJECT_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  PUBLICATION_STATUS_META,
} from './propertyDisplay';

/**
 * A list item and its full admin view; the export needs fields only the detail has. Deleted properties
 * have no detail view (404), so their detail-only cells stay empty.
 */
export interface PropertyExportRow {
  summary: PropertySummary;
  property: Property | null;
}

const REVIEW_ACTIONS = new Set(['approved', 'rejected', 'suspended', 'legal_status_changed']);
const text = (value: string | number | null | undefined) => (value == null ? '' : String(value));
const whole = (value: number | null) => (value === null ? '' : String(Math.round(value)));

function lastReview(property: Property | null) {
  return property
    ? [...property.statusHistory].reverse().find((change) => REVIEW_ACTIONS.has(change.action))
    : undefined;
}

function mediaOf(property: Property | null, type: string): string {
  return property ? String(property.media.filter((m) => m.mediaType === type).length) : '';
}

/** Overall area range across configurations, in sq.ft. */
function areaRange(property: Property | null): string {
  if (!property) return '';
  const mins = property.apartments
    .map((a) => areaInSqFt(a.areaMin, a.areaUnit))
    .filter((v): v is number => v !== null);
  const maxes = property.apartments
    .map((a) => areaInSqFt(a.areaMax, a.areaUnit))
    .filter((v): v is number => v !== null);
  if (mins.length === 0) return '';
  const low = Math.round(Math.min(...mins));
  const high = Math.round(Math.max(...maxes, ...mins));
  return low === high ? String(low) : `${low}-${high}`;
}

function coverOf(property: Property | null) {
  if (!property) return undefined;
  const photos = property.media.filter((m) => m.mediaType === 'photo');
  return photos.find((m) => m.primary) ?? photos[0];
}

const COLUMNS: readonly CsvColumn<PropertyExportRow>[] = [
  ['ID', ({ summary }) => String(summary.id)],
  ['Property name', ({ summary }) => summary.projectName],
  ['Property type', ({ summary }) => PROPERTY_TYPE_LABELS[summary.propertyType]],
  ['Description', ({ property }) => text(property?.projectInfo.projectDescription)],
  ['Status', ({ summary }) => PUBLICATION_STATUS_META[summary.publicationStatus].label],
  ['Legal approval', ({ summary }) => LEGAL_STATUS_META[summary.legalApprovalStatus].label],
  ['Construction status', ({ summary }) => PROJECT_STATUS_LABELS[summary.projectStatus]],
  ['RERA number', ({ summary }) => text(summary.reraNumber)],
  ['BHK configurations', ({ summary }) => formatApartmentTypes(summary.apartmentTypes)],
  ['Unit types', ({ property }) => text(property?.apartments.length)],
  [
    'Area (sq.ft, lowest-priced unit)',
    ({ summary }) => whole(areaInSqFt(summary.startingArea, summary.startingAreaUnit)),
  ],
  ['Area range (sq.ft)', ({ property }) => areaRange(property)],
  ['Parking', ({ summary }) => text(formatParking(summary.carParkingMin, summary.carParkingMax))],
  ['Builder', ({ summary }) => summary.builder?.fullName ?? summary.builderCompanyName],
  ['Builder user ID', ({ summary }) => text(summary.builderUserId)],
  ['Builder email', ({ summary }) => text(summary.builder?.email)],
  ['Builder phone', ({ summary }) => text(summary.builder?.phone)],
  ['Listed by', ({ summary }) => text(summary.ownerName)],
  ['Address', ({ summary }) => text(summary.projectAddress)],
  ['Locality', ({ summary }) => text(summary.locality)],
  ['Landmark', ({ property }) => text(property?.location.landmark)],
  ['City', ({ summary }) => text(summary.city)],
  ['State', ({ summary }) => text(summary.state)],
  ['Pincode', ({ summary }) => text(summary.pincode)],
  ['Starting price (INR)', ({ summary }) => text(summary.startingPrice)],
  [
    'Price per sq.ft (INR)',
    ({ summary }) =>
      text(pricePerSqFt(summary.startingPrice, summary.startingArea, summary.startingAreaUnit)),
  ],
  ['Thumbnail', ({ summary, property }) => text(coverOf(property)?.url ?? summary.coverUrl)],
  ['Media files', ({ summary }) => text(summary.mediaCount)],
  ['Photos', ({ property }) => mediaOf(property, 'photo')],
  ['Videos', ({ property }) => mediaOf(property, 'video')],
  ['Brochures', ({ property }) => mediaOf(property, 'brochure')],
  ['3D tour', ({ property }) => text(property?.threeDTourUrl)],
  ['Submitted on (UTC)', ({ summary }) => summary.createdAt],
  ['Sent for review (UTC)', ({ summary }) => text(summary.submittedAt)],
  ['Updated (UTC)', ({ summary }) => summary.updatedAt],
  ['Published (UTC)', ({ summary }) => text(summary.publishedAt)],
  ['Deleted (UTC)', ({ summary }) => text(summary.deletedAt)],
  ['Last review', ({ property }) => text(lastReview(property)?.action.replace(/_/g, ' '))],
  [
    'Last review result',
    ({ property }) => text(lastReview(property)?.toStatus?.replace(/_/g, ' ')),
  ],
  ['Last review (UTC)', ({ property }) => text(lastReview(property)?.createdAt)],
  ['Review reason', ({ property }) => text(lastReview(property)?.reason)],
];

export function toPropertyCsv(rows: readonly PropertyExportRow[]): string {
  return toCsv(COLUMNS, rows);
}
