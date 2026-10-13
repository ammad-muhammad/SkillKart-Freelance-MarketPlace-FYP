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
   
  stripe = require('stripe')(STRIPE_KEY);
}

const isLive = () => !!stripe && !STRIPE_DUMMY;

/**
 * Simulated sessions (no Stripe key, or STRIPE_DUMMY=true) used to be the guessable
 * string `sim_<phase>_<jobId>_<amountCents>` that verifyCheckoutSession accepted as
 * "paid" — so anyone could post a hand-made id for any amount and have a wallet
 * credited without ever going through checkout. A simulated id is now minted only
 * by createCheckoutSession and carries a random nonce plus an HMAC over
 * phase|jobId|cents|nonce|userId, keyed with a server secret. Verification
 * recomputes it, so only an id this server issued — to this user, for this amount —
 * counts. (The nonce also makes two top-ups of the same amount distinct sessions.)
 * Simulation itself is still "free money" by design; it is for local demos only.
 */
const crypto = require('crypto');
const simSecret = () => process.env.JWT_SECRET || 'skillkart-simulated-payments';
const simSignature = (phase, jobId, cents, nonce, userId) =>
  crypto.createHmac('sha256', simSecret()).update([phase, jobId, cents, nonce, userId || ''].join('|')).digest('hex').slice(0, 24);

const SIM_ID_RE = /^sim_([a-z]+)_([A-Za-z0-9]+)_(\d+)_([0-9a-f]{12})_([0-9a-f]{24})$/;

/** Parse and authenticate a simulated session id; null if it is not one we issued. */
const parseSimulatedSession = (sessionId, userId) => {
  const m = SIM_ID_RE.exec(String(sessionId || ''));
  if (!m) return null;
  const [, phase, jobId, cents, nonce, sig] = m;
  const expected = simSignature(phase, jobId, cents, nonce, userId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { phase, jobId, amountCents: parseInt(cents, 10) };
};

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
    // Simulated session — a signed, unguessable id (see simSignature above); the
    // success URL resolves the placeholder so the confirm step can look it up.
    // No real network call. A wallet top-up binds the id to its user.
    const cents = String(Math.round(amount * 100));
    const nonce = crypto.randomBytes(6).toString('hex');
    const id = `sim_${phase}_${jobId}_${cents}_${nonce}_${simSignature(phase, String(jobId), cents, nonce, metadata?.userId)}`;
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
 * A simulated session counts as paid only if its signature checks out (the id was
 * issued by createCheckoutSession — see simSignature). `userId` must be given for
 * a wallet top-up, whose id is bound to the user who started it.
 *
 * @returns {Promise<{ paid: boolean, paymentIntent: string|null, simulated: boolean }>}
 */
async function verifyCheckoutSession(sessionId, { userId } = {}) {
  if (!sessionId) return { paid: false, paymentIntent: null, simulated: false, amount_total: 0 };

  // The 'sim_' shortcut must ONLY apply in dummy/test mode — otherwise a
  // client could hand-craft a `sim_x_x_<amountCents>` id and have it accepted
  // as a paid session for an arbitrary amount even with a real Stripe key
  // configured, bypassing Stripe entirely. In live mode, always verify for
  // real regardless of what prefix the caller-supplied id happens to have.
  if (!isLive()) {
    // Format: sim_{phase}_{jobId}_{amountCents}_{nonce}_{signature}
    const sim = parseSimulatedSession(sessionId, userId);
    if (!sim) return { paid: false, paymentIntent: null, simulated: true, amount_total: 0 };
    return { paid: true, paymentIntent: `sim_pi_${sessionId}`, simulated: true, amount_total: sim.amountCents };
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
 * Expire an open Checkout Session so it can no longer be paid (used when a
 * client cancels an unpaid gig order). No-op for simulated sessions; Stripe
 * rejects expiring a session that's already complete/expired, which callers
 * treat as best-effort anyway.
 */
async function expireCheckoutSession(sessionId) {
  if (!sessionId || !isLive()) return { expired: false, simulated: true };
  await stripe.checkout.sessions.expire(sessionId);
  return { expired: true, simulated: false };
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
  expireCheckoutSession,
  createConnectAccount,
  createAccountLink,
  checkAccountStatus,
  createTransfer,
  createPayout,
  getConnectedBalance,
  getChargeIdFromPaymentIntent,
  isLive 
};
