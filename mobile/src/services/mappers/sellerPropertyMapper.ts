import { AmenityOption, PropertyDraft, SellerPropertyDetail } from '../../types';
import { ApiAmenity, ApiOwnerPropertyDetail, ApiPublicationStatus } from '../../types/api';
import { formatCompactPrice } from '../../utils/format';
import { absoluteUrl, amenityIcon, areaLabel, configLabel } from './propertyMapper';
import { BHK_TYPES, POSSESSION_STATUS, PROPERTY_TYPES } from './propertySearchMapper';

const LISTING_STATUS: Record<ApiPublicationStatus, SellerPropertyDetail['status']> = {
  draft: 'Incomplete',
  pending_review: 'Under Review',
  approved: 'Under Review',
  published: 'Active',
  rejected: 'Inactive',
  suspended: 'Inactive',
  archived: 'Inactive',
};

const BEDROOMS: Record<string, number> = { '1 BHK': 1, '2 BHK': 2, '3 BHK': 3, '4 BHK': 4, Penthouse: 4 };

export const bedroomsFor = (bhk: string): number => BEDROOMS[bhk] ?? 1;

export function toAmenityOption(a: ApiAmenity): AmenityOption {
  return { id: a.id, label: a.name, icon: amenityIcon(a.icon) };
}

/** Step 1: POST /properties and PATCH /properties/{id}/steps/1. */
export function toDetailsPayload(d: PropertyDraft) {
  return {
    propertyType: PROPERTY_TYPES[d.propertyType],
    projectName: d.projectName.trim(),
    builderCompanyName: d.builderName.trim(),
    projectEmail: d.email.trim(),
    projectPhone: d.phone,
  };
}

/** Step 2 of the backend wizard (location): PATCH /properties/{id}/steps/2. */
export function toLocationPayload(d: PropertyDraft) {
  return {
    projectAddress: d.address.trim(),
    city: d.city.trim(),
    locality: d.locality.trim(),
    pincode: d.pincode.trim(),
    state: d.state.trim(),
    // Both or neither; an explicit null clears a pin that was removed again.
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
  };
}

/** Step 3 (unit types): the wizard collects one configuration; PUT replaces the whole set. */
export function toApartmentsPayload(d: PropertyDraft) {
  const area = Number(d.areaSqft);
  return {
    apartments: [
      {
        apartmentName: d.bhk,
        apartmentType: BHK_TYPES[d.bhk],
        startingPrice: Number(d.price),
        bedrooms: bedroomsFor(d.bhk),
        bathrooms: Number(d.bathrooms),
        areaMin: area,
        areaMax: area,
      },
    ],
  };
}

/** Step 4 (project information): PATCH /properties/{id}/steps/4. */
export function toInfoPayload(d: PropertyDraft) {
  return { projectStatus: POSSESSION_STATUS[d.projectStatus], projectDescription: d.description.trim() };
}

export function toSellerPropertyDetail(p: ApiOwnerPropertyDetail): SellerPropertyDetail {
  const prices = p.apartments.map(a => a.startingPrice);
  const rejected = p.publicationStatus === 'rejected' ? [...p.statusHistory].reverse().find(h => h.toStatus === 'rejected') : undefined;
  return {
    id: String(p.id),
    title: p.details.projectName,
    area: [p.location.locality, p.location.city].filter(Boolean).join(', '),
    status: LISTING_STATUS[p.publicationStatus],
    rejectionReason: rejected?.reason ?? undefined,
    readyToSubmit: p.wizard.readyToSubmit,
    missing: p.wizard.steps.filter(s => !s.complete && s.step < 7).map(s => s.title),
    type: p.details.propertyType.replace(/^./, c => c.toUpperCase()),
    config: configLabel([...new Set(p.apartments.map(a => a.apartmentType))]),
    price: prices.length > 0 ? `${formatCompactPrice(Math.min(...prices))}*` : '',
    sqft: areaLabel(p.apartments),
    description: p.projectInfo.projectDescription ?? '',
    amenities: p.amenities.map(a => a.name),
    photoUrls: p.media.filter(m => m.mediaType === 'photo').map(m => absoluteUrl(m.url)).filter((u): u is string => !!u),
  };
}
