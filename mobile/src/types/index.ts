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

export interface FilterState {
  budget: [number, number];
  propertyType: string;
  bhk: string;
  possession: PossessionStatus | null;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  verified: boolean;
}

export type OtpPurpose = 'email_verification' | 'phone_verification';
