const Payment = require('../models/Payment');
const Job = require('../models/Job');
const Proposal = require('../models/Proposal');
const ClientProfile = require('../models/ClientProfile');
const FreelancerProfile = require('../models/FreelancerProfile');
const Withdrawal = require('../models/Withdrawal');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/apiError');
const { createCheckoutSession, verifyCheckoutSession, createConnectAccount, createAccountLink, checkAccountStatus, createTransfer, createPayout, getConnectedBalance, getChargeIdFromPaymentIntent } = require('../services/stripe.service');
const { finalizeJobCompletion } = require('../services/jobCompletion.service');
const notifications = require('../services/notification.service');

const FEE_RATE = 0.005; // 0.5% platform fee
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

async function resolveAmount(job) {
  // If a contract exists, use its price
  if (job.contractId) {
    const Contract = require('../models/Contract');
    const contract = await Contract.findById(job.contractId);
    if (contract && contract.type === 'fixed') {
      return Number(contract.fixedPrice) || 0;
    }
  }

  // Fallback to accepted proposal
  const accepted = await Proposal.findOne({ jobId: job._id, status: 'accepted' });
  if (accepted && accepted.fixedPrice) return Number(accepted.fixedPrice);
  
  const min = Number(job.budget?.min) || 0;
  const max = Number(job.budget?.max) || 0;
  if (min && max) return (min + max) / 2;
  return max || min || 0;
}

// Find or create the escrow record for a hired job.
async function getOrCreatePayment(job) {
  let payment = await Payment.findOne({ jobId: job._id });
  if (payment) return payment;

  const total = round2(await resolveAmount(job));
  const deposit = round2(total / 2);
  const final = round2(total - deposit);

  payment = await Payment.create({
    jobId: job._id,
    contractId: job.contractId || null,
    clientId: job.clientId,
    freelancerId: job.hiredFreelancer,
    totalAmount: total,
    depositAmount: deposit,
    finalAmount: final,
    feeRate: FEE_RATE,
    status: 'deposit_pending',
    type: 'job_escrow'
  });
  return payment;
}

function assertClientOwns(job, userId) {
  if (String(job.clientId) !== String(userId)) {
    throw new ForbiddenError('Only the project owner can pay for this project');
  }
}

/**
 * POST /payments/jobs/:jobId/deposit — start the 50% deposit checkout.
 * Client-only. Requires the job to be hired (in-progress) and unpaid.
 */
const startDeposit = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = await Job.findById(jobId);
  if (!job) throw new NotFoundError('Job not found');
  assertClientOwns(job, req.user._id);
  if (!job.hiredFreelancer) throw new BadRequestError('No freelancer is hired for this project yet');

  if (job.contractId) {
    const Contract = require('../models/Contract');
    const contract = await Contract.findById(job.contractId);
    if (contract && contract.type === 'hourly') {
      throw new BadRequestError('Hourly contracts are billed weekly, no upfront deposit is required.');
    }
  }

  const payment = await getOrCreatePayment(job);
  if (payment.status !== 'deposit_pending') {
    throw new BadRequestError('Deposit has already been paid for this project');
  }

  // If client has enough balance in their wallet, deduct it directly
  const clientProfile = await ClientProfile.findOne({ userId: req.user._id });
  if (clientProfile && clientProfile.walletBalance >= payment.depositAmount) {
    clientProfile.walletBalance = round2(clientProfile.walletBalance - payment.depositAmount);
    await clientProfile.save();

    payment.status = 'deposit_paid';
    payment.depositPaidAt = new Date();
    payment.stripe.simulated = true;
    await payment.save();

    if (payment.contractId) {
      const Contract = require('../models/Contract');
      await Contract.findByIdAndUpdate(payment.contractId, { paymentStatus: 'funded' });
    }

    if (job.hiredFreelancer) {
      notifications.onDepositFunded(job.hiredFreelancer, { job });
    }

    return sendSuccess(res, {
      message: 'Deposit funded successfully from your wallet balance',
      data: { walletPaid: true, payment }
    });
  }

  const session = await createCheckoutSession({
    jobId: String(job._id),
    phase: 'deposit',
    amount: payment.depositAmount,
    description: `SkillKart — 50% deposit for "${job.title}"`,
  });

  payment.stripe.depositSessionId = session.id;
  payment.stripe.simulated = session.simulated;
  await payment.save();

  sendSuccess(res, {
    message: 'Deposit checkout created',
    data: { checkoutUrl: session.url, sessionId: session.id, simulated: session.simulated, payment },
  });
});

/**
 * POST /payments/jobs/:jobId/final — start the remaining 50% checkout
 * (paid when accepting delivery). Client-only.
 */
const startFinal = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = await Job.findById(jobId);
  if (!job) throw new NotFoundError('Job not found');
  assertClientOwns(job, req.user._id);

  const payment = await Payment.findOne({ jobId: job._id, type: 'job_escrow' });
  if (!payment) throw new BadRequestError('No payment record — pay the deposit first');
  if (payment.status === 'deposit_pending') throw new BadRequestError('Pay the 50% deposit before the final payment');
  if (payment.status === 'released') throw new BadRequestError('This project has already been fully paid');

  // If client has enough balance in their wallet, deduct it directly
  const clientProfile = await ClientProfile.findOne({ userId: req.user._id });
  if (clientProfile && clientProfile.walletBalance >= payment.finalAmount) {
    clientProfile.walletBalance = round2(clientProfile.walletBalance - payment.finalAmount);
    await clientProfile.save();

    payment.platformFee = round2(payment.totalAmount * payment.feeRate);
    payment.freelancerPayout = round2(payment.totalAmount - payment.platformFee);
    payment.status = 'released';
    payment.releasedAt = new Date();
    payment.stripe.simulated = true;
    await payment.save();

    if (job.status !== 'completed') {
      job.status = 'completed';
      job.completedAt = new Date();
      await job.save();
      try {
        await finalizeJobCompletion(job, {
          freelancerEarning: payment.freelancerPayout,
          clientSpend: payment.totalAmount,
        });
      } catch (e) {
        console.error('[startFinal] stats roll-up failed:', e.message);
      }
      if (job.hiredFreelancer) {
        notifications.onPaymentReleased(job.hiredFreelancer, { job, amount: payment.freelancerPayout });
      }
    }

    return sendSuccess(res, {
      message: 'Final payment funded successfully from your wallet balance. Project completed!',
      data: { walletPaid: true, payment }
    });
  }

  const session = await createCheckoutSession({
    jobId: String(job._id),
    phase: 'final',
    amount: payment.finalAmount,
    description: `SkillKart — final 50% for "${job.title}"`,
  });

  payment.stripe.finalSessionId = session.id;
  payment.stripe.simulated = session.simulated;
  await payment.save();

  sendSuccess(res, {
    message: 'Final checkout created',
    data: { checkoutUrl: session.url, sessionId: session.id, simulated: session.simulated, payment },
  });
});

/**
 * POST /payments/jobs/:jobId/confirm — confirm a checkout session was paid and
 * advance the escrow. Body: { phase: 'deposit'|'final', sessionId }.
 *
 * - deposit confirmed → status deposit_paid (work can proceed)
 * - final confirmed   → status released; computes 0.5% fee + freelancer payout,
 *                        marks the job completed and rolls up stats.
 */
const confirmPayment = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { phase, sessionId } = req.body;
  if (!['deposit', 'final'].includes(phase)) throw new BadRequestError('Invalid payment phase');

  const job = await Job.findById(jobId);
  if (!job) throw new NotFoundError('Job not found');
  assertClientOwns(job, req.user._id);

  const payment = await Payment.findOne({ jobId: job._id });
  if (!payment) throw new BadRequestError('No payment record for this project');

  const expectedSession = phase === 'deposit' ? payment.stripe.depositSessionId : payment.stripe.finalSessionId;
  const verifyId = sessionId || expectedSession;
  const result = await verifyCheckoutSession(verifyId);
  if (!result.paid) throw new BadRequestError('Payment was not completed');

  if (phase === 'deposit') {
    if (payment.status === 'deposit_pending') {
      payment.status = 'deposit_paid';
      payment.depositPaidAt = new Date();
      payment.stripe.depositPaymentIntent = result.paymentIntent;
      await payment.save();
      
      if (payment.contractId) {
        const Contract = require('../models/Contract');
        await Contract.findByIdAndUpdate(payment.contractId, { paymentStatus: 'funded' });
      }

      // Tell the freelancer they can start/deliver now.
      if (job.hiredFreelancer) notifications.onDepositFunded(job.hiredFreelancer, { job });
    }
    return sendSuccess(res, { message: 'Deposit confirmed. Work can begin.', data: { payment } });
  }

  // phase === 'final'
  if (payment.status !== 'released') {
    payment.platformFee = round2(payment.totalAmount * payment.feeRate);
    payment.freelancerPayout = round2(payment.totalAmount - payment.platformFee);
    payment.status = 'released';
    payment.releasedAt = new Date();
    payment.stripe.finalPaymentIntent = result.paymentIntent;
    await payment.save();

    // Complete the job + roll up stats with the EXACT net amounts.
    if (job.status !== 'completed') {
      job.status = 'completed';
      job.completedAt = new Date();
      await job.save();
      try {
        await finalizeJobCompletion(job, {
          freelancerEarning: payment.freelancerPayout,
          clientSpend: payment.totalAmount,
        });

        // ==========================================
        // STRIPE CONNECT: SOURCE-TRACKED TRANSFER
        // Move funds to Freelancer's Stripe Wallet
        // ==========================================
        const profile = await FreelancerProfile.findOne({ userId: job.hiredFreelancer });
        if (profile && profile.stripeAccountId && profile.stripeOnboardingComplete) {
          // Send the deposit portion
          if (payment.stripe?.depositPaymentIntent) {
            const depositAmount = payment.freelancerPayout / 2;
            const chargeId = await getChargeIdFromPaymentIntent(payment.stripe.depositPaymentIntent);
            await createTransfer(depositAmount, profile.stripeAccountId, `Deposit release for Job ${job._id}`, chargeId);
          }
          // Send the final portion
          if (payment.stripe?.finalPaymentIntent) {
            const finalAmount = payment.freelancerPayout / 2;
            const chargeId = await getChargeIdFromPaymentIntent(payment.stripe.finalPaymentIntent);
            await createTransfer(finalAmount, profile.stripeAccountId, `Final release for Job ${job._id}`, chargeId);
          }
        }
      } catch (e) {
        console.error('[confirmPayment] stats roll-up or transfer failed:', e.message);
      }
      // Tell the freelancer they were paid.
      if (job.hiredFreelancer) {
        notifications.onPaymentReleased(job.hiredFreelancer, { job, amount: payment.freelancerPayout });
      }
    }
  }

  sendSuccess(res, { message: 'Final payment confirmed. Funds released to the freelancer (minus 0.5% fee).', data: { payment } });
});

/**
 * GET /payments/jobs/:jobId — fetch the escrow record for a job (client or the
 * hired freelancer may view).
 */
const getJobPayment = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = await Job.findById(jobId);
  if (!job) throw new NotFoundError('Job not found');

  const uid = String(req.user._id);
  if (uid !== String(job.clientId) && uid !== String(job.hiredFreelancer)) {
    throw new ForbiddenError('You are not a participant in this project');
  }

  const payment = await Payment.findOne({ jobId: job._id });
  sendSuccess(res, { message: 'Payment retrieved', data: { payment } });
});

/**
 * GET /payments/history — fetch all escrow records where the user is the client or freelancer
 */
const getMyPayments = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  
  // Find all payments where the user is either the client or freelancer
  const payments = await Payment.find({
    $or: [{ clientId: uid }, { freelancerId: uid }]
  })
  .populate('jobId', 'title status')
  .populate('clientId', 'firstName lastName email profilePicture')
  .populate('freelancerId', 'firstName lastName email profilePicture')
  .sort({ createdAt: -1 });

  // Find all withdrawals for the user
  const withdrawals = await Withdrawal.find({ userId: uid }).sort({ createdAt: -1 });

  sendSuccess(res, { data: { payments, withdrawals } });
});

/**
 * POST /payments/wallet/checkout
 * Start a Stripe checkout session to add funds to the wallet.
 */
const checkoutWalletDeposit = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || Number(amount) <= 0) {
    throw new BadRequestError('Invalid deposit amount');
  }

  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3001';
  
  const session = await createCheckoutSession({
    jobId: 'wallet', // Special ID for wallet
    phase: 'wallet',
    amount: Number(amount),
    description: `SkillKart — Wallet Deposit`,
    customSuccessUrl: `${CLIENT_URL}/client/wallet?session_id={CHECKOUT_SESSION_ID}`,
    customCancelUrl: `${CLIENT_URL}/client/wallet`,
    metadata: { userId: String(req.user._id) }
  });

  sendSuccess(res, {
    message: 'Wallet checkout created',
    data: { checkoutUrl: session.url, sessionId: session.id, simulated: session.simulated },
  });
});

/**
 * Add funds to wallet (Client) by confirming Stripe session
 */
const depositFunds = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    throw new BadRequestError('Missing session ID');
  }
  
  const result = await verifyCheckoutSession(sessionId);
  if (!result.paid) throw new BadRequestError('Payment was not completed');

  // result.amount_total is in cents
  const amountDeposited = (result.amount_total || 0) / 100;
  if (amountDeposited <= 0) {
    throw new BadRequestError('Invalid payment amount recorded');
  }
  // Idempotency Check: Ensure we haven't already processed this session
  const existingProfile = await ClientProfile.findOne({ userId: req.user._id });
  if (existingProfile && existingProfile.processedSessions && existingProfile.processedSessions.includes(sessionId)) {
    // The webhook already processed it, just return the current balance gracefully
    return sendSuccess(res, { message: 'Funds deposited successfully', data: { walletBalance: existingProfile.walletBalance } });
  }

  const profile = await ClientProfile.findOneAndUpdate(
    { userId: req.user._id },
    { 
      $inc: { walletBalance: amountDeposited },
      $addToSet: { processedSessions: sessionId }
    },
    { new: true }
  );

  const Payment = require('../models/Payment');
  await Payment.create({
    clientId: req.user._id,
    type: 'wallet_deposit',
    totalAmount: amountDeposited,
    depositAmount: amountDeposited,
    finalAmount: 0,
    status: 'released', // Show as completed
    depositPaidAt: new Date(),
    stripe: { depositSessionId: sessionId }
  });
  
  sendSuccess(res, { message: 'Funds deposited successfully', data: { walletBalance: profile.walletBalance } });
});



/**
 * Initiate Stripe Connect Onboarding
 */
const connectStripeAccount = asyncHandler(async (req, res) => {
  const profile = await FreelancerProfile.findOne({ userId: req.user._id });
  if (!profile) throw new NotFoundError('Profile not found');

  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await createConnectAccount(req.user.email || 'freelancer@example.com');
    accountId = account.id;
    profile.stripeAccountId = accountId;
    await profile.save();
  }

  // Determine return URL based on env
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3001';
  const returnUrl = `${CLIENT_URL}/freelancer/wallet/stripe-callback`;
  const refreshUrl = `${CLIENT_URL}/freelancer/wallet`;

  const link = await createAccountLink(accountId, refreshUrl, returnUrl);
  sendSuccess(res, { message: 'Stripe onboarding initiated', data: { url: link.url } });
});

/**
 * Handle return from Stripe Onboarding
 */
const stripeConnectCallback = asyncHandler(async (req, res) => {
  const profile = await FreelancerProfile.findOne({ userId: req.user._id });
  if (!profile || !profile.stripeAccountId) {
    throw new BadRequestError('No connected Stripe account found');
  }

  const status = await checkAccountStatus(profile.stripeAccountId);
  
  const isTestMode = (process.env.STRIPE_SECRET_KEY || '').includes('sk_test_');
  if (status.payouts_enabled || status.details_submitted || isTestMode) {
    profile.stripeOnboardingComplete = true;
    if (!profile.verificationDetails) {
      profile.verificationDetails = {};
    }
    profile.verificationDetails.paymentMethodAdded = true;
    await profile.save();
    return sendSuccess(res, { message: 'Stripe account connected successfully', data: { stripeOnboardingComplete: true } });
  }

  return sendSuccess(res, { message: 'Stripe onboarding incomplete', data: { stripeOnboardingComplete: false } });
});

/**
 * Withdraw funds from wallet (Freelancer)
 */
const withdrawFunds = asyncHandler(async (req, res) => {
  const { amount, method } = req.body;
  if (!amount || Number(amount) <= 0) {
    throw new BadRequestError('Invalid withdrawal amount');
  }
  
  const allowedMethods = ['bank_transfer', 'paypal', 'stripe'];
  if (!allowedMethods.includes(method)) {
    throw new BadRequestError('Invalid withdrawal method');
  }

  const profile = await FreelancerProfile.findOne({ userId: req.user._id });
  if (!profile) throw new NotFoundError('Profile not found');
  
  if (profile.walletBalance < Number(amount)) {
    throw new BadRequestError('Insufficient funds available for withdrawal.');
  }

  // Handle Stripe specifically (Manual Payouts)
  if (method === 'stripe') {
    if (!profile.stripeAccountId || !profile.stripeOnboardingComplete) {
      return res.status(200).json({
        success: true,
        message: 'Stripe onboarding required',
        data: { needs_onboarding: true }
      });
    }

    // Note: We bypass manual stripeBalance checking because Stripe holds test
    // mode balances in USD while our app amounts are in PKR. Comparing them
    // directly (e.g. 100 USD vs 20000 PKR) fails incorrectly.
    // Instead, we trust the local walletBalance (already checked above) 
    // and rely on Stripe to throw an error if the actual converted balance is too low.

    // Execute Real Stripe Payout
    const payout = await createPayout(amount, profile.stripeAccountId, 'pkr');
    
    const withdrawal = await Withdrawal.create({
      userId: req.user._id,
      amount: Number(amount),
      method,
      status: payout.simulated ? 'completed' : 'processing',
      transactionId: payout.id
    });

    profile.walletBalance -= Number(amount);
    await profile.save();
    
    notifications.onWithdrawalRequested(req.user._id, { amount, method });
    
    return sendSuccess(res, { message: `Payout of PKR ${amount} to your bank account initiated!`, data: { withdrawal, walletBalance: profile.walletBalance } });
  }
  
  // Create Withdrawal Request first (For Bank/PayPal)
  const withdrawal = await Withdrawal.create({
    userId: req.user._id,
    amount: Number(amount),
    method
  });

  profile.walletBalance -= Number(amount);
  await profile.save();
  
  // Trigger notification
  notifications.onWithdrawalRequested(req.user._id, { amount, method });

  sendSuccess(res, { message: `Withdrawal of Rs. ${amount} via ${method} initiated`, data: { withdrawal, walletBalance: profile.walletBalance } });
});

module.exports = {
  startDeposit,
  startFinal,
  confirmPayment,
  getJobPayment,
  getMyPayments,
  checkoutWalletDeposit,
  depositFunds,
  withdrawFunds,
  connectStripeAccount,
  stripeConnectCallback,
  FEE_RATE
};
