import client from './client';

/**
 * Escrow payments (Stripe test mode / dummy). 50% deposit up front, 50% on
 * delivery acceptance, 0.5% platform fee on release.
 */
export const paymentsAPI = {
  // Start the 50% deposit checkout → { checkoutUrl, sessionId, simulated }
  startDeposit: (jobId) =>
    client.post(`/payments/jobs/${jobId}/deposit`),

  // Start the remaining 50% checkout (on delivery acceptance)
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
  withdrawFunds: (amount, method) => client.post('/payments/wallet/withdraw', { amount, method })
};
