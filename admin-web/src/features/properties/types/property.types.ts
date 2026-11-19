import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

/** Enums of `backend/docs/api/properties.md` (lower-case wire values). */
export const PROPERTY_TYPES = ['apartment', 'villa', 'commercial'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PUBLICATION_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'published',
  'rejected',
  'suspended',
  'archived',
] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const LEGAL_APPROVAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'not_applicable',
] as const;
export type LegalApprovalStatus = (typeof LEGAL_APPROVAL_STATUSES)[number];

export const PROJECT_STATUSES = [
  'upcoming',
  'under_construction',
  'ready_to_move',
  'completed',
  'on_hold',
  'cancelled',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const APARTMENT_TYPES = ['1bhk', '2bhk', '3bhk', '4bhk', 'penthouse'] as const;
export type ApartmentType = (typeof APARTMENT_TYPES)[number];

export const LAND_AREA_UNITS = ['sq_ft', 'sq_m', 'acre', 'hectare'] as const;
export type AreaUnit = (typeof LAND_AREA_UNITS)[number];

export const APARTMENT_AREA_UNITS = ['sq_ft', 'sq_m'] as const satisfies readonly AreaUnit[];
export type ApartmentAreaUnit = (typeof APARTMENT_AREA_UNITS)[number];

export const NEARBY_PLACE_TYPES = [
  'school',
  'hospital',
  'shopping_mall',
  'metro_station',
  'railway_station',
  'airport',
  'bus_stop',
  'other',
] as const;
export type NearbyPlaceType = (typeof NEARBY_PLACE_TYPES)[number];

/** `PATCH /admin/properties/{id}/status` actions. The target status follows from the action. */
export const PUBLICATION_ACTIONS = [
  'submit',
  'approve',
  'reject',
  'publish',
  'unpublish',
  'suspend',
  'resume',
  'archive',
] as const;
export type PublicationAction = (typeof PUBLICATION_ACTIONS)[number];

/** Media types of a property (not of an apartment configuration). */
export type ProjectMediaType = 'photo' | 'video' | 'brochure';

/** Decimal values (prices, areas, coordinates) arrive as JSON numbers. */
export type Decimal = number;

/** `GET /admin/properties` item. */
export interface PropertySummary {
  id: EntityId;
  slug: string;
  projectName: string;
  builderCompanyName: string;
  propertyType: PropertyType;
  city: Nullable<string>;
  locality: Nullable<string>;
  state: Nullable<string>;
  pincode: Nullable<string>;
  projectStatus: ProjectStatus;
  legalApprovalStatus: LegalApprovalStatus;
  publicationStatus: PublicationStatus;
  /** First incomplete wizard step; 7 = ready to submit. */
  wizardStep: number;
  version: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  publishedAt: Nullable<IsoDateTime>;
  ownerId?: EntityId;
  deletedAt?: IsoDateTime;
  /** Lowest starting price of the configurations; absent when there are none. */
  startingPrice?: Decimal;
  apartmentTypes?: ApartmentType[];
  /** Admin content path of the cover photo (or an external URL); absent without photos. */
  coverUrl?: string;
}

export interface AmenityResponse {
  id: EntityId;
  name: string;
  slug: string;
  category: Nullable<string>;
  icon: Nullable<string>;
}

export interface MediaResponse {
  id: EntityId;
  mediaType: string;
  /** API path that streams the file after authorization, or the external URL. */
  url: string;
  external: boolean;
  mimeType: Nullable<string>;
  fileSize: Nullable<number>;
  originalFilename: Nullable<string>;
  title: Nullable<string>;
  description: Nullable<string>;
  sortOrder: number;
  primary: boolean;
  createdAt: IsoDateTime;
}

export interface ApartmentResponse {
  id: EntityId;
  apartmentName: string;
  apartmentType: ApartmentType;
  startingPrice: Decimal;
  currency: string;
  description: Nullable<string>;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  carParking: number;
  areaMin: Nullable<Decimal>;
  areaMax: Nullable<Decimal>;
  carpetArea: Nullable<Decimal>;
  balconyArea: Nullable<Decimal>;
  builtUpArea: Nullable<Decimal>;
  superBuiltUpArea: Nullable<Decimal>;
  areaUnit: ApartmentAreaUnit;
  highlights: string[];
  displayOrder: number;
  amenities: AmenityResponse[];
  media: MediaResponse[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NearbyPlaceResponse {
  id: EntityId;
  placeName: string;
  placeType: NearbyPlaceType;
  distanceKm: Decimal;
  /** `manual`: entered by a person, unverified. */
  distanceSource: string;
  latitude: Nullable<Decimal>;
  longitude: Nullable<Decimal>;
}

export interface WizardStep {
  step: number;
  key: string;
  title: string;
  complete: boolean;
  /** Required fields (or items such as `apartments`) still missing. */
  missing: string[];
}

/** `GET /admin/properties/{id}/wizard`, also embedded in every property response. */
export interface WizardProgress {
  propertyId: EntityId;
  version: number;
  publicationStatus: PublicationStatus;
  currentStep: number;
  completedSteps: number[];
  readyToSubmit: boolean;
  steps: WizardStep[];
}

export interface StatusChange {
  action: string;
  fromStatus: Nullable<string>;
  toStatus: Nullable<string>;
  reason: Nullable<string>;
  createdAt: IsoDateTime;
  actorUserId?: EntityId;
}

export interface PropertyOwner {
  id: EntityId;
  fullName: Nullable<string>;
  email: Nullable<string>;
  phone: Nullable<string>;
}

export interface PropertyDetails {
  propertyType: PropertyType;
  projectName: string;
  builderCompanyName: string;
  reraNumber: Nullable<string>;
  gstNumber: Nullable<string>;
  projectEmail: string;
  projectPhone: string;
}

export interface PropertyLocation {
  projectAddress: Nullable<string>;
  city: Nullable<string>;
  locality: Nullable<string>;
  pincode: Nullable<string>;
  state: Nullable<string>;
  landmark: Nullable<string>;
  latitude: Nullable<Decimal>;
  longitude: Nullable<Decimal>;
}

export interface ProjectInfo {
  totalTowersBlocks: Nullable<number>;
  totalUnitsFlats: Nullable<number>;
  projectStatus: ProjectStatus;
  legalApprovalStatus: LegalApprovalStatus;
  landArea: Nullable<Decimal>;
  landAreaUnit: Nullable<AreaUnit>;
  /** ISO date `YYYY-MM-DD`. */
  possessionStartDate: Nullable<string>;
  possessionEndDate: Nullable<string>;
  projectDescription: Nullable<string>;
  projectHighlights: string[];
}

/** `GET /admin/properties/{id}`: the admin view, returned by every admin property write. */
export interface Property {
  id: EntityId;
  slug: string;
  /** Send back as `If-Match` on writes. */
  version: number;
  publicationStatus: PublicationStatus;
  details: PropertyDetails;
  location: PropertyLocation;
  apartments: ApartmentResponse[];
  projectInfo: ProjectInfo;
  amenities: AmenityResponse[];
  media: MediaResponse[];
  threeDTourUrl: Nullable<string>;
  nearbyPlaces: NearbyPlaceResponse[];
  wizard: WizardProgress;
  statusHistory: StatusChange[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  publishedAt: Nullable<IsoDateTime>;
  owner?: PropertyOwner;
  deletedAt?: IsoDateTime;
}

/** `GET /admin/properties/stats`: non-deleted counts; each map adds up to `total`. */
export interface PropertyStats {
  total: number;
  byPublicationStatus: Record<PublicationStatus, number>;
  byLegalApprovalStatus: Record<LegalApprovalStatus, number>;
  deleted: number;
}

export type PropertySortField = 'createdAt' | 'updatedAt' | 'projectName' | 'city' | 'publishedAt';

export type DeletedFilter = 'exclude' | 'only' | 'include';

/** `GET /admin/properties` query. City, state and locality match exactly (ignoring case). */
export interface PropertyFilters extends PageParams {
  /** Project name, builder or slug. */
  search?: string;
  propertyType?: PropertyType;
  publicationStatus?: PublicationStatus;
  projectStatus?: ProjectStatus;
  city?: string;
  state?: string;
  locality?: string;
  pincode?: string;
  /** ISO-8601 instants, inclusive. */
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  deleted?: DeletedFilter;
}

// ---- Requests ----

export interface CreatePropertyRequest {
  propertyType: PropertyType;
  projectName: string;
  builderCompanyName: string;
  reraNumber?: string;
  gstNumber?: string;
  projectEmail: string;
  projectPhone: string;
}

/** PATCH semantics: omitted keeps the value, `null` clears an optional field. */
export type UpdateDetailsRequest = Partial<{
  propertyType: PropertyType;
  projectName: string;
  builderCompanyName: string;
  reraNumber: Nullable<string>;
  gstNumber: Nullable<string>;
  projectEmail: string;
  projectPhone: string;
}>;

export type UpdateLocationRequest = Partial<{
  projectAddress: string;
  city: string;
  locality: string;
  pincode: string;
  state: string;
  landmark: Nullable<string>;
  latitude: Nullable<Decimal>;
  longitude: Nullable<Decimal>;
}>;

export type UpdateProjectInfoRequest = Partial<{
  totalTowersBlocks: Nullable<number>;
  totalUnitsFlats: Nullable<number>;
  projectStatus: ProjectStatus;
  landArea: Nullable<Decimal>;
  landAreaUnit: Nullable<AreaUnit>;
  possessionStartDate: Nullable<string>;
  possessionEndDate: Nullable<string>;
  projectDescription: Nullable<string>;
  projectHighlights: Nullable<string[]>;
}>;

export interface UpdateMediaSettingsRequest {
  threeDTourUrl: Nullable<string>;
}

/** One configuration of `PUT /admin/properties/{id}/apartments` (a full replacement). */
export interface ApartmentRequest {
  /** Existing configuration to update; omit to create. */
  id?: EntityId;
  apartmentName: string;
  apartmentType: ApartmentType;
  startingPrice: Decimal;
  currency?: string;
  description?: string;
  bedrooms: number;
  bathrooms: number;
  balconies?: number;
  carParking?: number;
  areaMin: Decimal;
  areaMax: Decimal;
  carpetArea?: Decimal;
  balconyArea?: Decimal;
  builtUpArea?: Decimal;
  superBuiltUpArea?: Decimal;
  areaUnit?: ApartmentAreaUnit;
  highlights?: string[];
}

export interface NearbyPlaceRequest {
  placeName: string;
  placeType: NearbyPlaceType;
  distanceKm: Decimal;
}

export interface MediaUploadRequest {
  file: File;
  mediaType: ProjectMediaType;
  title?: string;
  primary?: boolean;
}

export interface ExternalVideoRequest {
  url: string;
  title?: string;
}

export interface StatusChangeRequest {
  action: PublicationAction;
  /** Required for reject and suspend. */
  reason?: string;
}

export interface LegalStatusRequest {
  status: LegalApprovalStatus;
  /** Required when rejecting. */
  reason?: string;
}
