import { useAsync } from '../../../hooks/useAsync';
import { sellerService } from '../../../services/sellerService';

export const useSellerListings = () => useAsync(() => sellerService.listings());
export const useSellerLeads = () => useAsync(() => sellerService.leads());
