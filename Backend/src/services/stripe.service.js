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

  // The 'sim_' shortcut must ONLY apply in dummy/test mode — otherwise a
  // client could hand-craft a `sim_x_x_<amountCents>` id and have it accepted
  // as a paid session for an arbitrary amount even with a real Stripe key
  // configured, bypassing Stripe entirely. In live mode, always verify for
  // real regardless of what prefix the caller-supplied id happens to have.
  if (!isLive()) {
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

/**
 * Get the latest Charge ID from a PaymentIntent ID
 */
async function getChargeIdFromPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) return null;
  // Same rule as verifyCheckoutSession: the sim_ shortcut only applies when
  // not live — in live mode a sim_-prefixed id is never legitimate and should
  // fail against the real Stripe API rather than being waved through.
  if (!isLive()) {
    return paymentIntentId.replace('sim_pi_', 'sim_ch_');
  }
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  return pi.latest_charge || null;
}

/**
 * Create a Stripe Connect Express Account
 */
async function createConnectAccount(email) {
  if (!isLive()) {
    return { id: `sim_acct_${Math.random().toString(36).substring(7)}`, simulated: true };
  }
  const account = await stripe.accounts.create({
    type: 'express',
    email: email,
    capabilities: {
      transfers: { requested: true },
    },
    settings: {
      payouts: {
        schedule: {
          interval: 'manual'
        }
      }
    }
  });
  return { id: account.id, simulated: false };
}

/**
 * Create an Account Link for onboarding
 */
async function createAccountLink(accountId, refreshUrl, returnUrl) {
  if (!isLive()) {
    return { url: `${returnUrl}?simulated=true`, simulated: true };
  }
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return { url: accountLink.url, simulated: false };
}

/**
 * Check Connect Account Status
 */
async function checkAccountStatus(accountId) {
  if (!isLive() || accountId.startsWith('sim_acct_')) {
    return { payouts_enabled: true, details_submitted: true, simulated: true };
  }
  const account = await stripe.accounts.retrieve(accountId);
  return {
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    simulated: false
  };
}

/**
 * Transfer funds from Platform to Connected Account
 */
async function createTransfer(amount, destinationAccountId, description, sourceTransaction, currency = 'pkr') {
  if (!isLive() || destinationAccountId.startsWith('sim_acct_')) {
    return { id: `sim_tr_${Math.random().toString(36).substring(7)}`, simulated: true };
  }
  
  const payload = {
    amount: Math.round(amount * 100),
    currency: currency,
    destination: destinationAccountId,
    description: description || 'SkillKart Freelancer Payout',
  };

  if (sourceTransaction) {
    payload.source_transaction = sourceTransaction;
  }

  const transfer = await stripe.transfers.create(payload);
  return { id: transfer.id, simulated: false };
}

/**
 * Payout funds from a Connected Account to their Bank
 */
async function createPayout(amount, stripeAccountId, currency = 'pkr') {
  if (!isLive() || stripeAccountId.startsWith('sim_acct_')) {
    return { id: `sim_po_${Math.random().toString(36).substring(7)}`, simulated: true };
  }

  try {
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100),
      currency: currency,
    }, {
      stripeAccount: stripeAccountId
    });
    
    return { id: payout.id, simulated: false };
  } catch (err) {
    // In test mode, if the account lacks funds (e.g. due to DB/Stripe mismatch from past bugs),
    // simulate a success so the withdrawal flow can still be tested.
    if (err.code === 'balance_insufficient' && String(process.env.STRIPE_SECRET_KEY).includes('sk_test_')) {
      console.warn(`[Stripe Test] Simulating payout due to insufficient Stripe balance for ${stripeAccountId}`);
      return { id: `sim_po_${Math.random().toString(36).substring(7)}`, simulated: true };
    }
    throw err;
  }
}

/**
 * Get available balance for a Connected Account
 */
async function getConnectedBalance(stripeAccountId) {
  if (!isLive() || stripeAccountId.startsWith('sim_acct_')) {
    return { available: 5000, pending: 0, currency: 'pkr', simulated: true };
  }

  const balance = await stripe.balance.retrieve({}, {
    stripeAccount: stripeAccountId
  });

  const availableAmount = balance.available.reduce((acc, b) => acc + b.amount, 0);
  const pendingAmount = balance.pending.reduce((acc, b) => acc + b.amount, 0);
  // Returns amounts in whole currency (not cents)
  return { 
    available: availableAmount / 100, 
    pending: pendingAmount / 100,
    currency: balance.available[0]?.currency || 'pkr',
    simulated: false 
  };
}

module.exports = { 
  createCheckoutSession, 
  verifyCheckoutSession, 
  createConnectAccount,
  createAccountLink,
  checkAccountStatus,
  createTransfer,
  createPayout,
  getConnectedBalance,
  getChargeIdFromPaymentIntent,
  isLive 
};
