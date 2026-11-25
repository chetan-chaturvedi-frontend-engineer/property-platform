import { useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { paymentService } from '../../../services/paymentService';
import { PaymentCancelledError } from '../../../services/razorpayCheckout';
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
      try {
        await subscriptionService.subscribe(selected);
      } catch (e) {
        // Paid plan: the backend refuses a free activation, so collect the payment with Razorpay instead.
        if (e instanceof ApiError && e.code === 'payment_required') {
          await paymentService.payForPlan(selected);
        } else {
          throw e;
        }
      }
      return 'subscribed';
    } catch (e) {
      if (e instanceof PaymentCancelledError) {
        setError('Payment cancelled. You have not been charged.');
        return 'failed';
      }
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
