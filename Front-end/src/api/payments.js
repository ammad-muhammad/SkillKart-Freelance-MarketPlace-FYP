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
  // Caller (ClientProjects.jsx) already shows its own contextual toast —
  // suppress the global auto-toast to avoid double-toasting.
  fundMilestone: (milestoneId) =>
    client.post(`/payments/milestones/${milestoneId}/fund`, undefined, { suppressErrorToast: true }),

  // Legacy: start the 50% deposit checkout → { checkoutUrl, sessionId, simulated }
  // (fixed-price/gig orders only now — hourly contracts use lockHourlyContract below)
  startDeposit: (jobId) =>
    client.post(`/payments/jobs/${jobId}/deposit`, undefined, { suppressErrorToast: true }),

  // Lock/re-lock an hourly contract's wallet escrow. Omit `amount` to use the
  // contract's standard one-week estimate. Caller (ClientProjects.jsx) shows
  // its own toast — suppress the global auto-toast to avoid double-toasting.
  lockHourlyContract: (contractId, amount) =>
    client.post(`/payments/contracts/${contractId}/lock-hourly`, amount ? { amount } : undefined, { suppressErrorToast: true }),

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
  getWithdrawalConfig: () => client.get('/payments/wallet/withdraw-config'),
  
  // Stripe Connect
  connectStripe: () => client.post('/payments/stripe/connect'),
  stripeCallback: () => client.post('/payments/stripe/callback'),
};
