import { SellerLead, SellerListing } from '../types';
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

  /** Leads the signed-in user created or owns. */
  async leads(): Promise<SellerLead[]> {
    const page = await apiClient.get<ApiPage<ApiLeadSummary>>(`/leads?size=${PAGE_SIZE}`);
    return page.content.map(l => toSellerLead(l));
  },
};
