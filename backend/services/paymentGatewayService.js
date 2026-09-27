// Simulated payment gateway.
//
// NO REAL PAYMENT PROVIDER (Razorpay/Stripe/PayU/etc.) IS INTEGRATED. This module
// exists so the rest of the app (Payment model, controllers, frontend) can be
// built against a realistic *shape* of gateway interaction — create an order,
// redirect/hand off, receive a callback that may succeed or fail — without
// pretending a real banking integration exists (see project ground rules:
// never claim an integration that doesn't exist).
//
// To wire in a REAL gateway later: implement `createOrder`/`verifyCallback`
// against that provider's SDK, keep the same return shape, and set
// PAYMENT_GATEWAY_PROVIDER + the provider's API keys in .env. Everything above
// this module (controllers, frontend) should not need to change.

const { gatewayOrderId } = require('../utils/idGenerator');

const PROVIDER_NAME = process.env.PAYMENT_GATEWAY_PROVIDER || 'krishisetu-mock-gateway';

// Demo-only: lets a caller force success/failure so the flow can be demonstrated
// deterministically (e.g. from tests or a "simulate failure" toggle in the UI),
// instead of only relying on real randomness which would make demos flaky.
const DEFAULT_FAILURE_RATE = Number(process.env.MOCK_GATEWAY_FAILURE_RATE || 0); // 0 = never auto-fail unless asked

/**
 * Step 1 of the simulated flow: "create an order" with the gateway before
 * redirecting the buyer to pay. Real gateways return an order id + a checkout
 * session/URL at this point; here we just mint an id.
 */
function createOrder({ amount, currency = 'INR', paymentMethod }) {
  if (!amount || amount <= 0) {
    throw new Error('Gateway order amount must be a positive number');
  }
  return {
    provider: PROVIDER_NAME,
    gatewayOrderId: gatewayOrderId(),
    amount,
    currency,
    paymentMethod,
    createdAt: new Date(),
    // A real gateway would return a hosted checkout URL here; simulated for demo UIs
    checkoutUrl: `mock-gateway://checkout/${paymentMethod}`,
  };
}

/**
 * Step 2: the "callback"/webhook a real gateway would send once the buyer
 * completes (or abandons) checkout. `forcedOutcome` lets a caller (a demo
 * "simulate failure" button, or a test) control the result deterministically;
 * without it, the outcome is randomized using MOCK_GATEWAY_FAILURE_RATE.
 */
function verifyCallback({ gatewayOrderId: orderId, forcedOutcome } = {}) {
  if (!orderId) {
    throw new Error('gatewayOrderId is required to verify a callback');
  }

  let success;
  if (forcedOutcome === 'success') success = true;
  else if (forcedOutcome === 'fail') success = false;
  else success = Math.random() >= DEFAULT_FAILURE_RATE;

  if (success) {
    return {
      success: true,
      gatewayTransactionId: `GTXN-${orderId.replace('GTW-', '')}`,
      completedAt: new Date(),
    };
  }

  const reasons = [
    'Payment declined by issuing bank',
    'Insufficient funds',
    'Payment timed out',
    'Buyer cancelled checkout',
  ];
  return {
    success: false,
    failureReason: reasons[Math.floor(Math.random() * reasons.length)],
    completedAt: new Date(),
  };
}

module.exports = { PROVIDER_NAME, createOrder, verifyCallback };
