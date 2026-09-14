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
const { PLATFORM_FEE_RATE: FEE_RATE, getPlatformFeeRate, getWithdrawalMinAmount, round2 } = require('../utils/constants');

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
  if (payment) {
    // A milestone-linked Payment belongs to the new wallet-native escrow
    // system (milestone.service.js), never this legacy 50/50 flow — even
    // though both use Payment.type:'job_escrow'. Reusing it here would let a
    // client pay through this flow AND fund/release the same milestone
    // through the milestone endpoints, double-charging/double-paying.
    if (payment.milestoneId) {
      throw new BadRequestError('This project uses milestone-based escrow — use the milestone endpoints instead.');
    }
    return payment;
  }

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
    feeRate: await getPlatformFeeRate(),
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

  // Atomic conditional debit (see startFinal for why this can't be a plain
  // read-then-write) — a double-click/retry must not debit the wallet twice.
  const updatedClientProfile = await ClientProfile.findOneAndUpdate(
    { userId: req.user._id, walletBalance: { $gte: payment.depositAmount } },
    { $inc: { walletBalance: -payment.depositAmount } },
    { new: true }
  );
  if (updatedClientProfile) {
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
  if (payment.milestoneId) throw new BadRequestError('This project uses milestone-based escrow — use the milestone endpoints instead.');
  if (payment.status === 'deposit_pending') throw new BadRequestError('Pay the 50% deposit before the final payment');
  if (payment.status === 'released') throw new BadRequestError('This project has already been fully paid');
  if (!job.delivery) throw new BadRequestError('Wait for the freelancer to submit delivery before releasing the final payment');

  // Atomic conditional debit — a plain read-then-write here let two concurrent
  // requests (double-click, network retry) both pass the balance check before
  // either wrote, debiting the client's wallet only once instead of twice
  // while both branches proceeded to mark the payment released.
  const updatedClientProfile = await ClientProfile.findOneAndUpdate(
    { userId: req.user._id, walletBalance: { $gte: payment.finalAmount } },
    { $inc: { walletBalance: -payment.finalAmount } },
    { new: true }
  );
  if (updatedClientProfile) {
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
  if (payment.milestoneId) throw new BadRequestError('This project uses milestone-based escrow — use the milestone endpoints instead.');

  const expectedSession = phase === 'deposit' ? payment.stripe.depositSessionId : payment.stripe.finalSessionId;
  const verifyId = sessionId || expectedSession;
  const result = await verifyCheckoutSession(verifyId);
  if (!result.paid) throw new BadRequestError('Payment was not completed');

  if (phase === 'deposit') {
    // Atomic claim — a plain status check + `.save()` (the old code) lets
    // the browser's redirect callback and the async Stripe webhook, which
    // both confirm the same checkout, race each other. Harmless for the
    // deposit phase today (no real money movement here), but keep it
    // idempotent for the same reason the final phase below must be.
    const claimedDeposit = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'deposit_pending' },
      { $set: { status: 'deposit_paid', depositPaidAt: new Date(), 'stripe.depositPaymentIntent': result.paymentIntent } },
      { new: true }
    );
    if (claimedDeposit) {
      payment.status = claimedDeposit.status;
      payment.depositPaidAt = claimedDeposit.depositPaidAt;
      payment.stripe.depositPaymentIntent = claimedDeposit.stripe.depositPaymentIntent;

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
    const platformFee = round2(payment.totalAmount * payment.feeRate);
    const freelancerPayout = round2(payment.totalAmount - platformFee);

    // Atomic claim — this is the one that matters. The old code did a plain
    // `if (payment.status !== 'released') { ...; await payment.save(); }`,
    // so the browser's redirect callback and the async Stripe webhook (both
    // of which call confirmPayment/this same logic for the same checkout)
    // could both read 'not released yet' before either write landed, and
    // both would go on to call createTransfer below — a REAL, duplicate
    // Stripe Connect transfer to the freelancer. This conditional update can
    // only succeed once per payment, exactly like releaseMilestone's claim.
    const claimedFinal = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $ne: 'released' } },
      {
        $set: {
          platformFee,
          freelancerPayout,
          status: 'released',
          releasedAt: new Date(),
          'stripe.finalPaymentIntent': result.paymentIntent,
        }
      },
      { new: true }
    );

    if (claimedFinal) {
      payment.platformFee = claimedFinal.platformFee;
      payment.freelancerPayout = claimedFinal.freelancerPayout;
      payment.status = claimedFinal.status;
      payment.releasedAt = claimedFinal.releasedAt;
      payment.stripe.finalPaymentIntent = claimedFinal.stripe.finalPaymentIntent;

      // Complete the job + roll up stats with the EXACT net amounts. Only
      // the winner of the claim above ever reaches this point for a given
      // payment, so there's no separate race to guard here.
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
    // else: lost the race, or a genuine repeat call — the winner (or the
    // webhook) already released this payment, so fall through to the
    // success response below rather than doing anything twice.
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

  // Atomic — folding the "not already processed" check into the filter
  // itself (rather than the separate pre-check above, which only reduces
  // the window, it doesn't close it) is what actually prevents a
  // near-simultaneous webhook + frontend confirm call (or two retries) from
  // both passing the check and both crediting the wallet for the same
  // Stripe session.
  const profile = await ClientProfile.findOneAndUpdate(
    { userId: req.user._id, processedSessions: { $ne: sessionId } },
    {
      $inc: { walletBalance: amountDeposited },
      $addToSet: { processedSessions: sessionId }
    },
    { new: true }
  );
  if (!profile) {
    // Lost the race (or a genuinely repeated request) — this session's
    // deposit already landed, so return the current balance rather than
    // crediting it again.
    const current = await ClientProfile.findOne({ userId: req.user._id });
    return sendSuccess(res, { message: 'Funds deposited successfully', data: { walletBalance: current?.walletBalance || 0 } });
  }

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
 * GET /payments/wallet/withdraw-config — the current admin-configurable
 * minimum withdrawal amount, so the freelancer wallet page can validate
 * against the real value instead of a hardcoded guess that can drift out
 * of sync if an admin raises SystemSettings.withdrawal_min_amount.
 */
const getWithdrawalConfig = asyncHandler(async (req, res) => {
  const minWithdrawal = await getWithdrawalMinAmount();
  sendSuccess(res, { data: { minWithdrawal } });
});

/**
 * Withdraw funds from wallet (Freelancer)
 */
const withdrawFunds = asyncHandler(async (req, res) => {
  const { amount, method } = req.body;
  const minWithdrawal = await getWithdrawalMinAmount();
  if (!amount || Number(amount) < minWithdrawal) {
    throw new BadRequestError(`Minimum withdrawal amount is Rs. ${minWithdrawal}`);
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

    // Reserve the funds atomically BEFORE calling Stripe. Two concurrent
    // withdrawal requests can both pass the plain balance check above; if the
    // debit happened only after createPayout(), both could reach that real,
    // irreversible call and both would succeed — debiting the ledger only
    // once afterward doesn't undo a second real payout. This conditional
    // update lets at most one concurrent request past it, so at most one can
    // ever reach createPayout() below.
    const reserved = await FreelancerProfile.findOneAndUpdate(
      { userId: req.user._id, walletBalance: { $gte: Number(amount) } },
      { $inc: { walletBalance: -Number(amount) } },
      { new: true }
    );
    if (!reserved) {
      throw new BadRequestError('Insufficient funds available for withdrawal. A concurrent withdrawal may have just been processed — check your withdrawal history before retrying.');
    }

    // Execute Real Stripe Payout — a real (non-simulated) Connect account can
    // still fail here (no bank/debit account attached, capabilities not yet
    // active, unsupported payout currency) even after onboarding completed,
    // so surface a friendly, actionable error instead of a raw 500.
    let payout;
    try {
      payout = await createPayout(amount, profile.stripeAccountId, 'pkr');
    } catch (err) {
      // The real payout never happened — refund the reservation.
      await FreelancerProfile.findOneAndUpdate(
        { userId: req.user._id },
        { $inc: { walletBalance: Number(amount) } }
      );
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
      referenceId: payout.id
    });

    notifications.onWithdrawalRequested(req.user._id, { amount, method });

    return sendSuccess(res, { message: `Payout of PKR ${amount} to your bank account initiated!`, data: { withdrawal, walletBalance: reserved.walletBalance } });
  }

  // Same atomic-debit guard as the Stripe branch above — reserve the funds
  // BEFORE creating the Withdrawal record. Creating the record first (the
  // previous order) could leave a real, admin-approvable Withdrawal row
  // persisted with no matching debit behind it, if this conditional update
  // then failed (e.g. a concurrent withdrawal already drained the balance).
  const updatedProfile = await FreelancerProfile.findOneAndUpdate(
    { userId: req.user._id, walletBalance: { $gte: Number(amount) } },
    { $inc: { walletBalance: -Number(amount) } },
    { new: true }
  );
  if (!updatedProfile) {
    throw new BadRequestError('Insufficient funds available for withdrawal. A concurrent withdrawal may have just been processed — check your withdrawal history before retrying.');
  }

  let withdrawal;
  try {
    withdrawal = await Withdrawal.create({
      userId: req.user._id,
      amount: Number(amount),
      method
    });
  } catch (err) {
    // The debit above already succeeded — if the record itself can't be
    // created, refund it rather than leaving the money silently debited
    // with no withdrawal to show for it.
    await FreelancerProfile.findOneAndUpdate({ userId: req.user._id }, { $inc: { walletBalance: Number(amount) } });
    throw err;
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
  getWithdrawalConfig,
  withdrawFunds,
  connectStripeAccount,
  stripeConnectCallback,
  fundMilestone,
  lockHourlyContract,
  FEE_RATE
};
