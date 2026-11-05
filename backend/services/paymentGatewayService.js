// Payment gateway integration layer.
//
// Implements an order-lifecycle simulation for local development and demos.
// To wire in a production provider (Razorpay / Stripe / PayU):
// Implement `createOrder` and `verifyCallback` against the provider SDK and configure
// PAYMENT_GATEWAY_PROVIDER and API credentials in your environment.
// Higher-level controllers and UI components interact with a standardized contract.

const { gatewayOrderId } = require('../utils/idGenerator');

const PROVIDER_NAME = process.env.PAYMENT_GATEWAY_PROVIDER || 'krishisetu-mock-gateway';

// Configurable failure rate for testing error recovery and edge cases (0 = always succeed)
const DEFAULT_FAILURE_RATE = Number(process.env.MOCK_GATEWAY_FAILURE_RATE || 0);

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
