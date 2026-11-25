import RazorpayCheckout, { RazorpaySuccess } from 'react-native-razorpay';
import { ApiCheckout } from '../types/api';

export class PaymentCancelledError extends Error {
  constructor() {
    super('Payment cancelled.');
    this.name = 'PaymentCancelledError';
  }
}

/** The only place that touches the Razorpay SDK. Opens the checkout sheet for an order the backend created. */
export async function openRazorpayCheckout(
  checkout: ApiCheckout,
  appName: string,
  themeColor: string,
  prefill?: { email?: string; contact?: string; name?: string },
): Promise<RazorpaySuccess> {
  try {
    return await RazorpayCheckout.open({
      key: checkout.keyId,
      order_id: checkout.orderId,
      amount: checkout.amount,
      currency: checkout.currency,
      name: appName,
      description: `${checkout.planTitle} plan`,
      prefill,
      theme: { color: themeColor },
    });
  } catch (e) {
    const err = e as { code?: number; description?: string };
    // The user closed the sheet; anything else is a real failure worth showing.
    if (err?.code === 0 || err?.code === 2 || /cancel/i.test(err?.description ?? '')) {
      throw new PaymentCancelledError();
    }
    throw new Error(err?.description ?? 'The payment could not be completed.');
  }
}
