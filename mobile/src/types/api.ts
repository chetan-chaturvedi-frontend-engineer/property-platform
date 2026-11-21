/** Wire shapes of the backend public property API (see backend/docs/api/properties.md). */

export type ApiApartmentType = '1bhk' | '2bhk' | '3bhk' | '4bhk' | 'penthouse';
export type ApiProjectStatus =
  | 'upcoming'
  | 'under_construction'
  | 'ready_to_move'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export interface ApiPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiPublicPropertySummary {
  id: number;
  slug: string;
  projectName: string;
  builderCompanyName: string;
  propertyType: string;
  city: string | null;
  locality: string | null;
  state: string | null;
  projectStatus: ApiProjectStatus;
  startingPrice: number | null;
  apartmentTypes: ApiApartmentType[];
  coverUrl: string | null;
  publishedAt: string;
}

export interface ApiAmenity {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  icon: string | null;
}

export interface ApiMedia {
  id: number;
  mediaType: string;
  url: string;
  external: boolean;
  primary: boolean;
  sortOrder: number;
}

export interface ApiApartment {
  id: number;
  apartmentName: string;
  apartmentType: ApiApartmentType;
  startingPrice: number;
  areaMin: number | null;
  areaMax: number | null;
  areaUnit: 'sq_ft' | 'sq_m';
}

export interface ApiPublicProperty {
  id: number;
  slug: string;
  projectName: string;
  location: { city: string | null; locality: string | null; state: string | null };
  apartments: ApiApartment[];
  projectStatus: ApiProjectStatus;
  possessionEndDate: string | null;
  amenities: ApiAmenity[];
  media: ApiMedia[];
}

export interface ApiUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  userType: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface ApiTokenResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: ApiUser;
}

export interface ApiVerificationStatus {
  message: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface ApiMessage {
  message: string;
}

/** RFC 9457 problem detail returned for every backend error. */
export interface ApiProblem {
  detail?: string;
  code?: string;
  errors?: Record<string, string>;
}

export type ApiVisitType = 'site_visit' | 'virtual_visit' | 'revisit';
export type ApiVisitStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';

export interface ApiSiteVisit {
  id: number;
  visitCode: string;
  property: { id: number; projectName: string; slug: string; city: string | null; locality: string | null };
  visitType: ApiVisitType;
  visitDate: string;
  visitTime: string;
  status: ApiVisitStatus;
}

export type ApiPublicationStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'suspended'
  | 'archived';

export interface ApiOwnerProperty {
  id: number;
  slug: string;
  projectName: string;
  city: string | null;
  locality: string | null;
  publicationStatus: ApiPublicationStatus;
  updatedAt: string;
}

export interface ApiLeadSummary {
  id: number;
  status: string;
  leadName: string;
  bhk: string | null;
  preferredLocation: string | null;
  createdAt: string;
}

export interface ApiPageSummary {
  heading: string;
  subHeading: string | null;
  slug: string;
}

export interface ApiCmsPage extends ApiPageSummary {
  content: string;
}

export interface ApiFaq {
  id: number;
  question: string;
  answer: string;
  category: string;
  categoryLabel: string | null;
  sortOrder: number;
}

export interface ApiFaqCategory {
  key: string;
  label: string;
}

export interface ApiBanner {
  id: number;
  title: string;
  type: string;
  placement: string;
  linkType: 'internal' | 'external' | null;
  link: string | null;
  imageUrl: string;
}

export interface ApiUserSettings {
  id: number;
  location: string | null;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notificationEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  timezone: string;
}

export interface ApiSubscriptionPlan {
  id: number;
  title: string;
  slug: string;
  price: number;
  currency: string;
  billingInterval: 'month' | 'year' | 'lifetime';
  billingIntervalCount: number;
  description: string | null;
  noOfProperties: number | null;
  noOfTeamMembers: number;
  features: string[];
  popular: boolean;
}

export interface ApiUserSubscription {
  id: number;
  planId: number;
  planTitle: string;
  status: string;
  noOfProperties: number | null;
  endsAt: string | null;
}

export interface ApiWizard {
  currentStep: number;
  completedSteps: number[];
  readyToSubmit: boolean;
  steps: { step: number; key: string; title: string; complete: boolean; missing: string[] }[];
}

export interface ApiOwnerApartment extends ApiApartment {
  bedrooms: number;
  bathrooms: number;
}

/** Full owner view of one property (GET /properties/{id}, /preview). */
export interface ApiOwnerPropertyDetail {
  id: number;
  slug: string;
  version: number;
  publicationStatus: ApiPublicationStatus;
  details: { propertyType: string; projectName: string; builderCompanyName: string; projectEmail: string; projectPhone: string };
  location: { projectAddress: string | null; city: string | null; locality: string | null; pincode: string | null; state: string | null };
  apartments: ApiOwnerApartment[];
  projectInfo: { projectStatus: ApiProjectStatus; projectDescription: string | null; possessionEndDate: string | null };
  amenities: ApiAmenity[];
  media: ApiMedia[];
  wizard: ApiWizard;
  statusHistory: { action: string; toStatus: string; reason: string | null }[];
}

export interface ApiNotification {
  id: number;
  type: 'site_visit_booked' | 'property_status_changed' | 'new_message';
  title: string;
  body: string;
  data: { propertyId?: number; visitId?: number; conversationId?: number } | null;
  read: boolean;
  createdAt: string;
}

export interface ApiConversation {
  id: number;
  property: { id: number; projectName: string | null; slug: string | null };
  otherParty: { id: number; fullName: string | null };
  role: 'buyer' | 'seller';
  lastMessage: { id: number; body: string; mine: boolean; createdAt: string } | null;
  unread: number;
  lastMessageAt: string;
}

export interface ApiChatMessage {
  id: number;
  conversationId: number;
  mine: boolean;
  body: string;
  createdAt: string;
}
