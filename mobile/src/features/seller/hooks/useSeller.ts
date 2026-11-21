import { useAsync } from '../../../hooks/useAsync';
import { sellerPropertyService } from '../../../services/sellerPropertyService';
import { sellerService } from '../../../services/sellerService';
import { subscriptionService } from '../../../services/subscriptionService';
import { useAuth } from '../../auth/AuthProvider';

/** Every seller list needs a signed-in user; they load (or reload) when the session appears. */
function useWhenSignedIn<T>(load: () => Promise<T>, empty: T) {
  const { status } = useAuth();
  return useAsync(() => (status === 'signedIn' ? load() : Promise.resolve(empty)), [status]);
}

export const useSellerListings = () => useWhenSignedIn(() => sellerService.listings(), []);
export const useSellerLeads = () => useWhenSignedIn(() => sellerService.leads(), []);
export const useSiteVisitCount = () => useWhenSignedIn(() => sellerService.siteVisitCount(), 0);
export const useSellerEngagement = () => useWhenSignedIn(() => sellerService.engagement(), { views: 0, uniqueViewers: 0, saves: 0 });
export const useMySubscription = () => useWhenSignedIn(() => subscriptionService.mine(), null);
export const useSubscriptionPlans = () => useAsync(() => subscriptionService.plans());

/** One of the seller's own properties, in full. */
export const useSellerProperty = (id: string) => useAsync(() => sellerPropertyService.get(id), [id]);
