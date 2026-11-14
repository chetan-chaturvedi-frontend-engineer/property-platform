import { useAsync } from '../../../hooks/useAsync';
import { sellerService } from '../../../services/sellerService';
import { useAuth } from '../../auth/AuthProvider';

/** Both lists need a signed-in user; they load (or reload) when the session appears. */
export function useSellerListings() {
  const { status } = useAuth();
  return useAsync(() => (status === 'signedIn' ? sellerService.listings() : Promise.resolve([])), [status]);
}

export function useSellerLeads() {
  const { status } = useAuth();
  return useAsync(() => (status === 'signedIn' ? sellerService.leads() : Promise.resolve([])), [status]);
}
