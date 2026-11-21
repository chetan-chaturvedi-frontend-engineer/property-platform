import { SellerEngagement, SellerLead, SellerListing } from '../types';
import { ApiLeadSummary, ApiOwnerProperty, ApiPage } from '../types/api';
import { apiClient } from './api/apiClient';
import { toSellerLead, toSellerListing } from './mappers/sellerMapper';

const PAGE_SIZE = 50;

export const sellerService = {
  /** The signed-in user's own properties, drafts included. */
  async listings(): Promise<SellerListing[]> {
    const page = await apiClient.get<ApiPage<ApiOwnerProperty>>(`/properties?size=${PAGE_SIZE}`);
    return page.content.map(toSellerListing);
  },

  /** Views and saves summed over the seller's own properties; counts only. */
  async engagement(): Promise<SellerEngagement> {
    return apiClient.get<SellerEngagement>('/properties/engagement');
  },

  /** How many site visits are booked on the seller's properties (the visits they are the builder of). */
  async siteVisitCount(): Promise<number> {
    const page = await apiClient.get<ApiPage<unknown>>('/site-visits?relation=builder&size=1');
    return page.totalElements;
  },

  /** Leads the signed-in user created or owns. */
  async leads(): Promise<SellerLead[]> {
    const page = await apiClient.get<ApiPage<ApiLeadSummary>>(`/leads?size=${PAGE_SIZE}`);
    return page.content.map(l => toSellerLead(l));
  },
};
