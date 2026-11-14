import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OtpPurpose } from '../types';

export type RootStackParamList = {
  BuyerTabs: undefined;
  SellerTabs: undefined;
  // Auth
  Login: { identifier?: string; notice?: string } | undefined;
  Register: undefined;
  VerifyOtp: { identifier: string; purpose: OtpPurpose };
  // Buyer
  PropertyDetails: { id: string };
  ApartmentDetails: { id: string };
  ScheduleVisit: { id: string };
  SiteVisit: { id: string };
  VirtualTour: { id: string };
  Bookings: undefined;
  Compare: undefined;
  Notifications: undefined;
  RecentlyViewed: undefined;
  Settings: undefined;
  Filters: undefined;
  EmiCalculator: undefined;
  Chat: { id: string; title: string };
  Legal: { doc: 'privacy' | 'terms' };
  DeleteAccount: undefined;
  // Seller
  SellerRegistration: undefined;
  SellerVerification: undefined;
  AddProperty: undefined;
  PreviewListing: undefined;
  Published: undefined;
  SellerPropertyDetails: { id: string };
  PropertyPerformance: { id: string };
};

export type BuyerTabParamList = {
  Home: undefined;
  Search: undefined;
  Chats: undefined;
  Saved: undefined;
  Profile: undefined;
};

export type SellerTabParamList = {
  Dashboard: undefined;
  Properties: undefined;
  Leads: undefined;
  SellerChats: undefined;
  Account: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
