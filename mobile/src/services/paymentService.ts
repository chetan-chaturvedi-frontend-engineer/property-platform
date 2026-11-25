import { colors } from '../theme';
import { MySubscription } from '../types';
import { ApiCheckout, ApiPaymentResult } from '../types/api';
import { apiClient } from './api/apiClient';
import { toMySubscription } from './mappers/subscriptionMapper';
import { openRazorpayCheckout } from './razorpayCheckout';

const APP_NAME = 'Property Pro';

export const paymentService = {
  /**
   * Pays for a plan: the backend creates the order and fixes the amount, Razorpay collects the payment, then the
   * backend verifies the signed result and activates the plan. Returns null only when the user already had a plan.
   */
  async payForPlan(planId: number, prefill?: { email?: string; contact?: string; name?: string }): Promise<MySubscription | null> {
    const checkout = await apiClient.post<ApiCheckout>('/subscriptions/checkout', { planId });
    const result = await openRazorpayCheckout(checkout, APP_NAME, colors.primary, prefill);
    const verified = await apiClient.post<ApiPaymentResult>('/subscriptions/verify', {
      razorpayOrderId: result.razorpay_order_id,
      razorpayPaymentId: result.razorpay_payment_id,
      razorpaySignature: result.razorpay_signature,
    });
    return verified.subscription ? toMySubscription(verified.subscription) : null;
  },
};
