import { SellerLead, SellerListing } from '../types';
import { mockLeads, mockSellerListings } from './mockData';

export const sellerService = {
  listings: (): Promise<SellerListing[]> => Promise.resolve(mockSellerListings),
  leads: (): Promise<SellerLead[]> => Promise.resolve(mockLeads),
};
