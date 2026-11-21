export type PossessionStatus = 'Ready to Move' | 'Under Construction' | 'New Launch';

export interface Property {
  /** Public slug: the route param and the key for the detail endpoint. */
  id: string;
  /** Numeric backend id, required when booking a site visit. */
  propertyId: number;
  /** Cover photo URL; the tinted placeholder shows when absent. */
  coverUrl?: string;
  name: string;
  area: string;
  config: string;
  price: string;
  sqft: string;
  facing: string;
  status: PossessionStatus;
  possession: string;
  /** The backend has no ratings yet. */
  rating?: number;
  photos: number;
  tone: number;
}

export interface Unit {
  id: string;
  name: string;
  sqft: string;
  facing: string;
  price: string;
}

export interface Amenity {
  icon: string;
  label: string;
}

export type BookingStatus = 'Upcoming' | 'Completed' | 'Cancelled';
export type VisitType = 'Site Visit' | 'Video Call' | 'Virtual Tour';

export interface Booking {
  /** Visit code shown to the user, e.g. SV-100012. */
  id: string;
  /** Numeric backend id, used to cancel. */
  visitId: number;
  name: string;
  config: string;
  area: string;
  date: string;
  day: string;
  time: string;
  type: VisitType;
  status: BookingStatus;
}

export interface ChatThread {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
}

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
}

export type ListingPurpose = 'For Sale' | 'For Rent' | 'Draft';

export interface SellerListing {
  id: string;
  title: string;
  area: string;
  price: string;
  sqft: string;
  purpose: ListingPurpose;
  status: 'Active' | 'Incomplete' | 'Under Review' | 'Inactive';
  /** Engagement counters are not tracked by the backend yet, so they are absent. */
  views?: number;
  leads?: number;
  saves?: number;
}

export interface SellerLead {
  id: string;
  name: string;
  initials: string;
  kind: 'New Lead' | 'Enquiry' | 'Lead';
  message: string;
  time: string;
  unread: number;
}

export interface VisitSlot {
  label: string;
  available: boolean;
}

export interface VisitRequest {
  /** Numeric backend id of the property (not the slug). */
  propertyId: number;
  type: VisitType;
  /** yyyy-MM-dd, local date at the property. */
  date: string;
  /** HH:mm, 24-hour. */
  time: string;
  fullName: string;
  mobile: string;
  email: string;
  people: number;
  notes?: string;
}

export interface EmiInput {
  principal: number;
  annualRatePct: number;
  tenureYears: number;
}

export interface EmiResult {
  emi: number;
  totalInterest: number;
  totalPayment: number;
}

/** Search and filter choices; `null` / empty means "no filter" for that field. */
export interface FilterState {
  /** [min, max] in rupees, or null for any budget. */
  budget: [number, number] | null;
  propertyType: string | null;
  bhk: string | null;
  possession: PossessionStatus | null;
  city: string;
}

export interface PropertyPage {
  items: Property[];
  /** Total matches across all pages, for "N properties found". */
  total: number;
}

export interface CmsPage {
  heading: string;
  /** Plain text paragraphs (HTML already converted). */
  body: string;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export interface FaqCategory {
  key: string;
  label: string;
}

export interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  link: string | null;
  linkType: 'internal' | 'external' | null;
}

export interface UserSettings {
  location: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notificationsEnabled: boolean;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  verified: boolean;
}

export type OtpPurpose = 'email_verification' | 'phone_verification';

export interface SubscriptionPlan {
  id: number;
  title: string;
  /** e.g. "₹999 / month" or "Free". */
  priceLabel: string;
  description: string;
  features: string[];
  /** e.g. "Up to 10 properties" or "Unlimited properties". */
  limitLabel: string;
  popular: boolean;
}

export interface MySubscription {
  planTitle: string;
  /** null = unlimited. */
  propertyLimit: number | null;
  endsAt: string | null;
}

export interface AmenityOption {
  id: number;
  label: string;
  icon: string;
}

export interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}

/** One property of the signed-in seller, as the detail, preview and review screens show it. */
export interface SellerPropertyDetail {
  id: string;
  title: string;
  area: string;
  status: SellerListing['status'];
  /** Why the review rejected it, when it was. */
  rejectionReason?: string;
  readyToSubmit: boolean;
  /** Human-readable list of what is still missing before it can be submitted. */
  missing: string[];
  type: string;
  config: string;
  price: string;
  sqft: string;
  description: string;
  amenities: string[];
  photoUrls: string[];
}

/** Everything the Add Property wizard collects; saved to the backend step by step. */
export interface PropertyDraft {
  propertyType: string;
  projectName: string;
  builderName: string;
  email: string;
  phone: string;
  bhk: string;
  areaSqft: string;
  price: string;
  bathrooms: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  description: string;
  projectStatus: PossessionStatus;
  amenityIds: number[];
  photos: PickedPhoto[];
}

export interface SellerEngagement {
  views: number;
  uniqueViewers: number;
  saves: number;
}

export type NotificationKind = 'site_visit_booked' | 'property_status_changed';

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  /** ISO instant; shown as a relative time. */
  createdAt: string;
  /** Ids for opening the related screen. */
  propertyId?: number;
}
