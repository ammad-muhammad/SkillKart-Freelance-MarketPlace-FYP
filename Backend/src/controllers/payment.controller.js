const Payment = require('../models/Payment');
const Job = require('../models/Job');
const Proposal = require('../models/Proposal');
const ClientProfile = require('../models/ClientProfile');
const FreelancerProfile = require('../models/FreelancerProfile');
const Withdrawal = require('../models/Withdrawal');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/apiError');
const { createCheckoutSession, verifyCheckoutSession, createConnectAccount, createAccountLink, checkAccountStatus, createTransfer, createPayout, getConnectedBalance, getChargeIdFromPaymentIntent, isLive } = require('../services/stripe.service');
const { finalizeJobCompletion } = require('../services/jobCompletion.service');
const notifications = require('../services/notification.service');
const { fundMilestoneFromWallet } = require('../services/milestone.service');
const { estimateWeeklyLockAmount, lockHourlyEscrow, drawDownForTimeLog } = require('../services/hourlyEscrow.service');
const { PLATFORM_FEE_RATE: FEE_RATE, round2 } = require('../utils/constants');

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
  if (!amount || Number(amount) < 5) {
    throw new BadRequestError('Minimum deposit amount is Rs. 5');
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
  // A simulated ID (created while STRIPE_DUMMY=true, before a real Stripe key
  // was configured) doesn't exist in Stripe — reusing it against the live API
  // throws "No such account". Fast-path check for the known fake prefix so we
  // don't waste an API round trip on the common case.
  const isStaleSimulatedId = accountId && accountId.startsWith('sim_acct_');
  if (!accountId || (isLive() && isStaleSimulatedId)) {
    const account = await createConnectAccount(req.user.email || 'freelancer@example.com');
    accountId = account.id;
    profile.stripeAccountId = accountId;
    profile.stripeOnboardingComplete = false;
    await profile.save();
  }

  // Determine return URL based on env
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3001';
  const returnUrl = `${CLIENT_URL}/freelancer/wallet/stripe-callback`;
  const refreshUrl = `${CLIENT_URL}/freelancer/wallet`;

  let link;
  try {
    link = await createAccountLink(accountId, refreshUrl, returnUrl);
  } catch (err) {
    // A real-looking (non-"sim_acct_") id can still be stale — e.g. it was
    // created under a different Stripe key (test vs live) than the one now
    // configured, or the account was deleted from the Stripe dashboard.
    // Self-heal by creating a fresh account rather than leaving the
    // freelancer permanently stuck on "Connect Stripe".
    const isMissingAccount = err.code === 'resource_missing' || /No such account/i.test(err.message || '');
    if (!isMissingAccount) throw err;

    const account = await createConnectAccount(req.user.email || 'freelancer@example.com');
    accountId = account.id;
    profile.stripeAccountId = accountId;
    profile.stripeOnboardingComplete = false;
    await profile.save();
    link = await createAccountLink(accountId, refreshUrl, returnUrl);
  }

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

  // Trust Stripe's own account status rather than short-circuiting on
  // "any sk_test_ key" — that previously marked onboarding complete even
  // when a real (non-simulated) Connect account had never actually
  // finished the hosted onboarding form (no bank details, no capabilities).
  if (status.payouts_enabled || status.details_submitted) {
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

    // Execute Real Stripe Payout — a real (non-simulated) Connect account can
    // still fail here (no bank/debit account attached, capabilities not yet
    // active, unsupported payout currency) even after onboarding completed,
    // so surface a friendly, actionable error instead of a raw 500.
    let payout;
    try {
      payout = await createPayout(amount, profile.stripeAccountId, 'pkr');
    } catch (err) {
      console.error('Stripe payout failed:', err.message);
      throw new BadRequestError(
        `Stripe payout failed: ${err.message || 'your connected account may be missing a payout method.'} Please finish your Stripe onboarding (add a bank/debit account) and try again.`
      );
    }

    const withdrawal = await Withdrawal.create({
      userId: req.user._id,
      amount: Number(amount),
      method,
      status: payout.simulated ? 'completed' : 'processing',
      transactionId: payout.id
    });

    // Atomic conditional debit — two concurrent withdrawal requests (a
    // double-click, or a client retry after a slow response) could otherwise
    // both pass the balance check above before either writes, debiting the
    // wallet only once instead of twice while creating two Withdrawal rows.
    const updatedProfile = await FreelancerProfile.findOneAndUpdate(
      { userId: req.user._id, walletBalance: { $gte: Number(amount) } },
      { $inc: { walletBalance: -Number(amount) } },
      { new: true }
    );
    if (!updatedProfile) {
      // The payout already happened by this point — this only fires if a
      // concurrent request won the race and drained the balance first.
      throw new BadRequestError('Insufficient funds available for withdrawal. A concurrent withdrawal may have just been processed — check your withdrawal history before retrying.');
    }

    notifications.onWithdrawalRequested(req.user._id, { amount, method });

    return sendSuccess(res, { message: `Payout of PKR ${amount} to your bank account initiated!`, data: { withdrawal, walletBalance: updatedProfile.walletBalance } });
  }

  // Create Withdrawal Request first (For Bank/PayPal)
  const withdrawal = await Withdrawal.create({
    userId: req.user._id,
    amount: Number(amount),
    method
  });

  // Same atomic-debit guard as the Stripe branch above.
  const updatedProfile = await FreelancerProfile.findOneAndUpdate(
    { userId: req.user._id, walletBalance: { $gte: Number(amount) } },
    { $inc: { walletBalance: -Number(amount) } },
    { new: true }
  );
  if (!updatedProfile) {
    throw new BadRequestError('Insufficient funds available for withdrawal. A concurrent withdrawal may have just been processed — check your withdrawal history before retrying.');
  }

  // Trigger notification
  notifications.onWithdrawalRequested(req.user._id, { amount, method });

  sendSuccess(res, { message: `Withdrawal of Rs. ${amount} via ${method} initiated`, data: { withdrawal, walletBalance: updatedProfile.walletBalance } });
});

/**
 * POST /payments/milestones/:milestoneId/fund — lock 100% of a milestone's
 * amount in escrow (client-only). Milestone 1 on a fresh hire is funded
 * automatically as part of accepting the proposal (proposal.controller.js);
 * this endpoint is for funding milestone 2+ once the client is ready to
 * start that phase — milestones are funded sequentially, not all upfront.
 */
const fundMilestone = asyncHandler(async (req, res) => {
  const { milestoneId } = req.params;
  const Milestone = require('../models/Milestone');
  const Contract = require('../models/Contract');

  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) throw new NotFoundError('Milestone not found');

  const contract = await Contract.findById(milestone.contractId);
  if (!contract) throw new NotFoundError('Contract not found');
  if (String(contract.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the project owner can fund this milestone');
  }

  // Don't allow funding the next milestone while an earlier one on this
  // contract has an unresolved dispute.
  const disputed = await Milestone.findOne({ contractId: contract._id, 'dispute.status': 'pending' });
  if (disputed) {
    throw new BadRequestError('This contract has an unresolved dispute — resolve it before funding the next milestone.');
  }

  // Milestones fund in order — can't skip ahead of an unreleased earlier one.
  if (milestone.order > 1) {
    const previous = await Milestone.findOne({ contractId: contract._id, order: milestone.order - 1 });
    if (previous && previous.status !== 'released') {
      throw new BadRequestError('The previous milestone must be released before funding this one.');
    }
  }

  const job = await Job.findById(milestone.jobId);
  const payment = await fundMilestoneFromWallet({
    milestone,
    job,
    contract,
    clientId: req.user._id,
    performedBy: req.user._id
  });

  sendSuccess(res, {
    message: 'Milestone funded successfully from your wallet balance',
    data: { milestone, payment }
  });
});

/**
 * Lock (or re-lock/top-up) an hourly contract's escrow from the client's
 * wallet. Defaults to one week's estimate (hourlyRate * weeklyLimit) unless
 * an explicit `amount` is given. After locking, opportunistically pays out
 * any time logs that were left unbilled while escrow was dry, oldest first,
 * stopping as soon as the balance runs out again.
 */
const lockHourlyContract = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { amount } = req.body;
  const Contract = require('../models/Contract');
  const TimeLog = require('../models/TimeLog');

  const contract = await Contract.findById(contractId);
  if (!contract) throw new NotFoundError('Contract not found');
  if (contract.type !== 'hourly') {
    throw new BadRequestError('This endpoint is only for hourly contracts');
  }
  if (String(contract.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the project owner can fund this contract');
  }

  const defaultAmount = contract.hourlyEscrow?.weeklyLockAmount
    || estimateWeeklyLockAmount({ hourlyRate: contract.hourlyRate, weeklyLimit: contract.weeklyLimit });
  const lockAmount = round2(Number(amount) || defaultAmount);
  if (lockAmount <= 0) {
    throw new BadRequestError('Enter a valid amount to lock.');
  }

  const job = await Job.findById(contract.jobId);
  const payment = await lockHourlyEscrow({
    contract,
    job,
    clientId: req.user._id,
    amount: lockAmount,
    performedBy: req.user._id
  });

  // Catch up any hours that piled up unpaid while the lock was dry.
  const pendingLogs = await TimeLog.find({ contractId: contract._id, status: 'pending' }).sort({ startTime: 1 });
  for (const log of pendingLogs) {
    try {
      await drawDownForTimeLog({ timeLog: log, contract, job });
    } catch (err) {
      if (!err.errors?.insufficientBalance) {
        console.error(`[lockHourlyContract] Unexpected error settling time log ${log._id}:`, err.message);
      }
      break; // out of balance again — remaining logs stay pending
    }
  }

  sendSuccess(res, {
    message: 'Escrow locked successfully from your wallet balance',
    data: { contract, payment }
  });
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
  fundMilestone,
  lockHourlyContract,
  FEE_RATE
};
