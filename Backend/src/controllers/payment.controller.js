const Payment = require('../models/Payment');
const Job = require('../models/Job');
const Proposal = require('../models/Proposal');
const ClientProfile = require('../models/ClientProfile');
const FreelancerProfile = require('../models/FreelancerProfile');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/apiError');
const { createCheckoutSession, verifyCheckoutSession } = require('../services/stripe.service');
const { finalizeJobCompletion } = require('../services/jobCompletion.service');
const notifications = require('../services/notification.service');

const FEE_RATE = 0.005; // 0.5% platform fee
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Derive the agreed project amount from the accepted proposal (preferred) or
// fall back to the job budget midpoint.
async function resolveAmount(job) {
  const accepted = await Proposal.findOne({ jobId: job._id, status: 'accepted' }).select('proposedRate');
  const rate = Number(accepted?.proposedRate);
  if (rate > 0) return rate;
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
    clientId: job.clientId,
    freelancerId: job.hiredFreelancer,
    totalAmount: total,
    depositAmount: deposit,
    finalAmount: final,
    feeRate: FEE_RATE,
    status: 'deposit_pending',
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

  const payment = await getOrCreatePayment(job);
  if (payment.status !== 'deposit_pending') {
    throw new BadRequestError('Deposit has already been paid for this project');
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

  const payment = await Payment.findOne({ jobId: job._id });
  if (!payment) throw new BadRequestError('No payment record — pay the deposit first');
  if (payment.status === 'deposit_pending') throw new BadRequestError('Pay the 50% deposit before the final payment');
  if (payment.status === 'released') throw new BadRequestError('This project has already been fully paid');

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
      } catch (e) {
        console.error('[confirmPayment] stats roll-up failed:', e.message);
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

  sendSuccess(res, { data: { payments } });
});

/**
 * Add funds to wallet (Client)
 */
const depositFunds = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || Number(amount) <= 0) {
    throw new BadRequestError('Invalid deposit amount');
  }
  
  const profile = await ClientProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $inc: { walletBalance: Number(amount) } },
    { new: true }
  );
  
  sendSuccess(res, { message: 'Funds deposited successfully', data: { walletBalance: profile.walletBalance } });
});

/**
 * Withdraw funds from wallet (Freelancer)
 */
const withdrawFunds = asyncHandler(async (req, res) => {
  const { amount, method } = req.body;
  if (!amount || Number(amount) <= 0) {
    throw new BadRequestError('Invalid withdrawal amount');
  }
  
  const profile = await FreelancerProfile.findOne({ userId: req.user._id });
  if (!profile) throw new NotFoundError('Profile not found');
  
  if (profile.walletBalance < Number(amount)) {
    throw new BadRequestError('Insufficient funds available for withdrawal.');
  }
  
  profile.walletBalance -= Number(amount);
  await profile.save();
  
  sendSuccess(res, { message: `Withdrawal of $${amount} via ${method} initiated`, data: { walletBalance: profile.walletBalance } });
});

module.exports = {
  startDeposit,
  startFinal,
  confirmPayment,
  getJobPayment,
  getMyPayments,
  depositFunds,
  withdrawFunds,
  FEE_RATE
};
