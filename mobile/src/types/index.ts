export type PossessionStatus = 'Ready to Move' | 'Under Construction' | 'New Launch';

export interface Property {
  id: string;
  name: string;
  area: string;
  config: string;
  price: string;
  sqft: string;
  facing: string;
  status: PossessionStatus;
  possession: string;
  rating: number;
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
  id: string;
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
  views: number;
  leads: number;
  saves: number;
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
  propertyId: string;
  type: VisitType;
  date: string;
  time: string;
  fullName: string;
  mobile: string;
  email: string;
  people: string;
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
