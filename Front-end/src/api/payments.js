import client from './client';

/**
 * Escrow payments (Stripe test mode / dummy). Fixed-price contracts now lock
 * 100% of each milestone's amount in escrow (see `fundMilestone` below) —
 * milestone 1 is funded automatically as part of accepting a proposal.
 * `startDeposit`/`startFinal` below are the legacy 50%/50% split endpoints,
 * kept for any pre-existing in-flight escrow records but no longer used by
 * new hires.
 */
export const paymentsAPI = {
  // Fund a milestone (100% lock, wallet-only) — used for milestone 2+ once
  // the client is ready to start that phase. Milestone 1 funds automatically
  // when the proposal is accepted, so this is never called for it.
  fundMilestone: (milestoneId) =>
    client.post(`/payments/milestones/${milestoneId}/fund`),

  // Legacy: start the 50% deposit checkout → { checkoutUrl, sessionId, simulated }
  startDeposit: (jobId) =>
    client.post(`/payments/jobs/${jobId}/deposit`),

  // Legacy: start the remaining 50% checkout (on delivery acceptance)
  startFinal: (jobId) =>
    client.post(`/payments/jobs/${jobId}/final`),

  // Confirm a checkout session was paid; advances the escrow
  confirm: (jobId, phase, sessionId) =>
    client.post(`/payments/jobs/${jobId}/confirm`, { phase, sessionId }),

  // Get the escrow record for a job
  getForJob: (jobId) =>
    client.get(`/payments/jobs/${jobId}`),

  // Get all transaction history for the logged-in user
  getHistory: () => client.get('/payments/history'),

  // Start a Stripe Checkout session to add funds to the wallet
  startWalletDeposit: (amount) => client.post('/payments/wallet/checkout', { amount }),

  // Confirm a wallet deposit
  depositFunds: (sessionId) => client.post('/payments/wallet/deposit', { sessionId }),
  withdrawFunds: (amount, method) => client.post('/payments/wallet/withdraw', { amount, method }),
  
  // Stripe Connect
  connectStripe: () => client.post('/payments/stripe/connect'),
  stripeCallback: () => client.post('/payments/stripe/callback'),
};
