// =============================================================================
// JalSeva - Razorpay Simulation Layer
// =============================================================================
// Simulates Razorpay payment processing without requiring real API keys.
// Generates realistic-looking order IDs, payment IDs, and signatures.
// All payments auto-succeed after a short simulated delay.
// =============================================================================

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Simulation Helpers
// ---------------------------------------------------------------------------

const SIMULATION_SECRET = 'jalseva_sim_secret_key';

function generateId(prefix: string): string {
  const random = crypto.randomBytes(8).toString('hex');
  return `${prefix}_sim_${random}`;
}

function generateSignature(orderId: string, paymentId: string): string {
  const body = `${orderId}|${paymentId}`;
  return crypto
    .createHmac('sha256', SIMULATION_SECRET)
    .update(body)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// createOrder (Simulated)
// ---------------------------------------------------------------------------

/**
 * Simulates creating a Razorpay order.
 * Returns a realistic order object without calling real Razorpay APIs.
 */
export async function createOrder(
  amount: number,
  currency: string = 'INR',
  receipt: string
) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const orderId = generateId('order');

  console.log(`[Razorpay Sim] Created order: ${orderId} | ₹${amount / 100} | ${receipt}`);

  return {
    id: orderId,
    entity: 'order',
    amount,
    amount_paid: 0,
    amount_due: amount,
    currency,
    receipt,
    status: 'created',
    attempts: 0,
    created_at: Math.floor(Date.now() / 1000),
    notes: {
      platform: 'JalSeva',
      receipt,
      simulated: 'true',
    },
  };
}

// ---------------------------------------------------------------------------
// verifyPayment (Simulated)
// ---------------------------------------------------------------------------

/**
 * Verifies the simulated payment signature.
 * Uses the same HMAC-SHA256 approach but with the simulation secret.
 */
export function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const expectedSignature = generateSignature(orderId, paymentId);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// simulateCheckout
// ---------------------------------------------------------------------------

/**
 * Generates a simulated payment result as if the user completed checkout.
 * Call this from the client-side instead of opening the real Razorpay modal.
 */
export function simulateCheckout(razorpayOrderId: string) {
  const paymentId = generateId('pay');
  const signature = generateSignature(razorpayOrderId, paymentId);

  return {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  };
}

// ---------------------------------------------------------------------------
// createPayout (Simulated)
// ---------------------------------------------------------------------------

/**
 * Simulates a payout to a supplier's bank account.
 * Returns a realistic payout object without calling RazorpayX APIs.
 */
export async function createPayout(
  supplierId: string,
  amount: number,
  bankDetails: {
    accountNumber: string;
    ifsc: string;
    accountHolderName: string;
  }
) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const contactId = generateId('cont');
  const fundAccountId = generateId('fa');
  const payoutId = generateId('pout');

  console.log(
    `[Razorpay Sim] Payout: ${payoutId} | ₹${amount / 100} → ${bankDetails.accountHolderName} (${bankDetails.ifsc})`
  );

  return {
    id: payoutId,
    entity: 'payout',
    contact_id: contactId,
    fund_account_id: fundAccountId,
    amount,
    currency: 'INR',
    mode: 'IMPS',
    purpose: 'payout',
    status: 'processed',
    reference_id: `PAYOUT_${supplierId}_${Date.now()}`,
    narration: 'JalSeva Supplier Payout',
    notes: {
      platform: 'JalSeva',
      supplierId,
      simulated: 'true',
    },
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ---------------------------------------------------------------------------
// Simulated Razorpay-like client (no-op, for import compatibility)
// ---------------------------------------------------------------------------

const razorpay = {
  orders: { create: createOrder },
  payments: { fetch: async (id: string) => ({ id, status: 'captured', simulated: true }) },
};

export { razorpay, generateSignature as _generateSignature };
export default razorpay;
