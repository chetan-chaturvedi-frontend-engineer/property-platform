# Subscription payments (Razorpay)

Paid plans are bought in three steps. The amount is always the plan's price; the client never sends one.

| Step | Endpoint | Auth |
|---|---|---|
| 1. Create order | `POST /api/v1/subscriptions/checkout` `{ "planId": 2 }` | Bearer, `SUBSCRIPTION_CREATE` |
| 2. Pay | Razorpay checkout in the app, using the response of step 1 | |
| 3. Confirm | `POST /api/v1/subscriptions/verify` | Bearer, `SUBSCRIPTION_CREATE` |
| Safety net | `POST /api/v1/public/payments/razorpay/webhook` | HMAC signature header `X-Razorpay-Signature` |

## Checkout

Response `200`: `{ keyId, orderId, amount, currency, planTitle }` where `amount` is in **paise** (999 INR = 99900).

Errors: `400 payment_not_required` (free plan, use `POST /subscriptions`), `404 subscription_plan_not_found`,
`409 subscription_already_active`, `409 subscription_plan_unavailable`, `503 payments_unavailable` (gateway keys not set).

## Verify

Request: `{ "razorpayOrderId", "razorpayPaymentId", "razorpaySignature" }` (the three values from the checkout result).
The server checks `HMAC_SHA256(orderId + "|" + paymentId, keySecret)` and activates the plan.

Response `200`: `{ "status": "paid", "subscription": { ... } }`; `subscription` is null only when the user already had a
subscription in force. Repeating the call is safe and activates nothing twice.

Errors: `400 payment_signature_invalid`, `404 payment_not_found` (unknown order or another user's order).

## Webhook

Configure in the Razorpay dashboard (Settings -> Webhooks) with events `payment.captured` and `order.paid`.
It activates the plan when the app never called verify (app closed or offline after paying). Always `200` for a correctly
signed event, `400` for a bad or missing signature. Not part of the client contract.

## Configuration

`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (see `.env.example`). Without the key id and secret,
checkout answers `503`. The key secret and webhook secret never go to the app.
