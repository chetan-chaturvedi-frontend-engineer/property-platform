import { useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { subscriptionService } from '../../../services/subscriptionService';
import { useAuth } from '../../auth/AuthProvider';

export type RegistrationOutcome = 'subscribed' | 'needsLogin' | 'failed';

/** Choosing a plan is how a user becomes a seller: it unlocks creating properties. */
export function useSellerRegistration() {
  const { status } = useAuth();
  const [selected, setSelected] = useState<number>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function subscribe(): Promise<RegistrationOutcome> {
    if (status !== 'signedIn') {
      return 'needsLogin';
    }
    if (selected === undefined || submitting) {
      return 'failed';
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await subscriptionService.subscribe(selected);
      return 'subscribed';
    } catch (e) {
      // Already subscribed: the user can go straight on.
      if (e instanceof ApiError && e.code === 'subscription_already_active') {
        return 'subscribed';
      }
      setError(e instanceof ApiError ? e.message : 'Could not reach the server. Check your connection.');
      return 'failed';
    } finally {
      setSubmitting(false);
    }
  }

  return { selected, setSelected, error, submitting, subscribe };
}
