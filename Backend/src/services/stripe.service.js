/**
 * Stripe service (TEST MODE / dummy payments).
 *
 * Uses a real Stripe Checkout Session when STRIPE_SECRET_KEY is set (test key →
 * no real money). When no key is configured it falls back to a SIMULATED
 * checkout so the whole escrow flow still works for the demo: it returns a
 * synthetic session id and a success URL that points straight at the app's
 * payment-confirmation route, which the confirm step accepts.
 */

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3001';

const STRIPE_DUMMY = process.env.STRIPE_DUMMY === 'true';

let stripe = null;
if (STRIPE_KEY && !STRIPE_DUMMY) {
  // Lazy require so the app still boots if the package is missing.
  // eslint-disable-next-line global-require
  stripe = require('stripe')(STRIPE_KEY);
}

const isLive = () => !!stripe && !STRIPE_DUMMY;

/**
 * Create a checkout session for a payment phase ('deposit' | 'final').
 *
 * @param {object} opts
 * @param {string} opts.jobId
 * @param {string} opts.phase        'deposit' | 'final'
 * @param {number} opts.amount       amount in whole PKR
 * @param {string} opts.description  line-item description
 * @returns {Promise<{ id: string, url: string, simulated: boolean }>}
 */
async function createCheckoutSession({ jobId, phase, amount, description, metadata, customSuccessUrl, customCancelUrl }) {
  const successUrl = customSuccessUrl || `${CLIENT_URL}/payment/confirm?job=${jobId}&phase=${phase}&session={CHECKOUT_SESSION_ID}`;
  const cancelUrl = customCancelUrl || `${CLIENT_URL}/payment/cancel?job=${jobId}&phase=${phase}`;

  if (!isLive()) {
    // Simulated session — synthetic id; success URL resolves the placeholder so
    // the confirm step can look it up. No real network call.
    const id = `sim_${phase}_${jobId}_${Math.round(amount * 100)}`;
    return {
      id,
      url: successUrl.replace('{CHECKOUT_SESSION_ID}', id),
      simulated: true,
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'pkr',
        product_data: { name: description || `SkillKart ${phase} payment` },
        unit_amount: Math.round(amount * 100), // cents
      },
      quantity: 1,
    }],
    metadata: { jobId: String(jobId), phase, ...(metadata || {}) },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { id: session.id, url: session.url, simulated: false };
}

/**
 * Verify a checkout session was paid.
 * For simulated sessions (id starts with 'sim_') we treat it as paid.
 *
 * @returns {Promise<{ paid: boolean, paymentIntent: string|null, simulated: boolean }>}
 */
async function verifyCheckoutSession(sessionId) {
  if (!sessionId) return { paid: false, paymentIntent: null, simulated: false, amount_total: 0 };

  if (sessionId.startsWith('sim_') || !isLive()) {
    // Format: sim_{phase}_{jobId}_{amountCents}
    const parts = sessionId.split('_');
    const amountCents = parseInt(parts[parts.length - 1], 10) || 0;
    return { paid: true, paymentIntent: `sim_pi_${sessionId}`, simulated: true, amount_total: amountCents };
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    paid: session.payment_status === 'paid',
    paymentIntent: session.payment_intent || null,
    simulated: false,
    amount_total: session.amount_total || 0,
  };
}

module.exports = { createCheckoutSession, verifyCheckoutSession, isLive };
