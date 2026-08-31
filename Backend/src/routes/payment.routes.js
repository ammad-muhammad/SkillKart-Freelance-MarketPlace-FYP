const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

/**
 * Escrow payments (Stripe test mode / dummy). All routes require auth; the
 * paying actions are client-only.
 */

// Start the 50% deposit checkout
router.post('/jobs/:jobId/deposit', authenticate, requireRole('client'), paymentController.startDeposit);

// Start the remaining 50% checkout (on delivery acceptance)
router.post('/jobs/:jobId/final', authenticate, requireRole('client'), paymentController.startFinal);

// Confirm a checkout session was paid and advance the escrow
router.post('/jobs/:jobId/confirm', authenticate, requireRole('client'), paymentController.confirmPayment);

// Fund a milestone (100% lock) — used for milestone 2+ on a milestone-split
// contract; milestone 1 is funded automatically when the proposal is accepted.
router.post('/milestones/:milestoneId/fund', authenticate, requireRole('client'), paymentController.fundMilestone);

// Lock/re-lock an hourly contract's wallet escrow (defaults to one week's
// estimate) — the initial lock happens automatically at proposal accept;
// this is for topping up once the running balance runs low.
router.post('/contracts/:contractId/lock-hourly', authenticate, requireRole('client'), paymentController.lockHourlyContract);

// View the escrow record for a job (client or hired freelancer)
router.get('/jobs/:jobId', authenticate, paymentController.getJobPayment);

// View transaction history for the logged-in user
router.get('/history', authenticate, paymentController.getMyPayments);

// Wallet endpoints (Simulated balances)
router.post('/wallet/checkout', authenticate, requireRole('client'), paymentController.checkoutWalletDeposit);
router.post('/wallet/deposit', authenticate, requireRole('client'), paymentController.depositFunds);
router.post('/wallet/withdraw', authenticate, requireRole('freelancer'), paymentController.withdrawFunds);

// Stripe Connect Endpoints for Freelancers
router.post('/stripe/connect', authenticate, requireRole('freelancer'), paymentController.connectStripeAccount);
router.post('/stripe/callback', authenticate, requireRole('freelancer'), paymentController.stripeConnectCallback);

module.exports = router;
