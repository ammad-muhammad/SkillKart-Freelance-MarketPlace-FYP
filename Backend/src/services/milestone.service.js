/**
 * milestone.service.js — shared fund/release logic for fixed-price
 * Milestones, reused by both controllers (proposal.controller.js's hire-time
 * lock, payment.controller.js's "fund next milestone") and, later, the
 * manual approve endpoint and the 7-day auto-release cron — so there's one
 * place that moves escrow money for a milestone, not several copies that can
 * drift apart.
 */
const ClientProfile = require('../models/ClientProfile');
const FreelancerProfile = require('../models/FreelancerProfile');
const Payment = require('../models/Payment');
const Milestone = require('../models/Milestone');
const ContractHistory = require('../models/ContractHistory');
const SystemSettings = require('../models/SystemSettings');
const notifications = require('./notification.service');
const { finalizeJobCompletion } = require('./jobCompletion.service');
const { PLATFORM_FEE_RATE, round2 } = require('../utils/constants');
const { BadRequestError } = require('../utils/apiError');

const DEFAULT_ESCROW_RELEASE_DAYS = 7;

/**
 * Days a client has to review a submitted milestone before it auto-releases.
 * Reads the admin-configurable SystemSettings value, falling back to the
 * default if the setting is somehow missing (e.g. a fresh unseeded DB).
 */
async function getEscrowReleaseDays() {
  const setting = await SystemSettings.findOne({ key: 'escrow_release_days' }).lean();
  const days = Number(setting?.value);
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_ESCROW_RELEASE_DAYS;
}

/**
 * Fund a milestone (100% lock) by debiting the client's wallet. Only wallet
 * balance is supported today (no inline Stripe-checkout fallback here, unlike
 * the legacy deposit flow) — a client short on funds is told to top up their
 * wallet first, via the existing wallet-deposit Stripe flow.
 *
 * Throws BadRequestError on anything that should stop the caller from
 * proceeding (wrong status, insufficient balance) — callers must not have
 * made irreversible related writes before calling this that they can't leave
 * in a sane, retryable state if it throws.
 */
async function fundMilestoneFromWallet({ milestone, job, contract, clientId, performedBy }) {
  if (milestone.status !== 'pending_funding') {
    throw new BadRequestError(`Milestone is not awaiting funding (status: ${milestone.status})`);
  }

  // Atomic conditional debit — a plain read-then-write here would let two
  // concurrent funding attempts (e.g. accepting two proposals in close
  // succession) both pass the balance check before either writes, debiting
  // the wallet only once instead of twice.
  const updatedProfile = await ClientProfile.findOneAndUpdate(
    { userId: clientId, walletBalance: { $gte: milestone.amount } },
    { $inc: { walletBalance: -milestone.amount } },
    { new: true }
  );
  if (!updatedProfile) {
    const clientProfile = await ClientProfile.findOne({ userId: clientId }).lean();
    const balance = clientProfile?.walletBalance || 0;
    throw new BadRequestError(
      `Insufficient wallet balance to fund this milestone. Need Rs. ${milestone.amount}, have Rs. ${round2(balance)}. Please top up your wallet first.`
    );
  }

  const payment = await Payment.create({
    jobId: job._id,
    contractId: contract._id,
    milestoneId: milestone._id,
    clientId,
    freelancerId: contract.freelancerId,
    totalAmount: milestone.amount,
    depositAmount: milestone.amount,
    finalAmount: milestone.amount,
    feeRate: PLATFORM_FEE_RATE,
    status: 'deposit_paid',
    depositPaidAt: new Date(),
    type: 'job_escrow',
    stripe: { simulated: true }
  });

  milestone.status = 'funded';
  milestone.fundedAt = new Date();
  await milestone.save();

  await ContractHistory.create({
    contractId: contract._id,
    action: 'milestone_funded',
    newValue: { milestoneId: milestone._id, order: milestone.order, amount: milestone.amount },
    performedBy
  });

  if (job.hiredFreelancer) {
    notifications.onDepositFunded(job.hiredFreelancer, { job });
  }

  return payment;
}

/**
 * Release a funded-and-submitted milestone's escrow to the freelancer's
 * wallet. Shared by the manual "Approve" action and the 7-day auto-release
 * cron so the money-movement logic exists in exactly one place.
 *
 * @param {object} opts
 * @param {object} opts.milestone
 * @param {object} opts.contract
 * @param {object} opts.job
 * @param {boolean} [opts.auto] whether this release was triggered by the
 *   auto-release cron rather than a manual client approval (affects the
 *   ContractHistory action label + notification copy only).
 * @returns {Promise<{payment, freelancerPayout}>}
 */
async function releaseMilestone({ milestone, contract, job, auto = false }) {
  const payment = await Payment.findOne({ milestoneId: milestone._id, type: 'job_escrow' });
  if (!payment) throw new BadRequestError('No escrow payment found for this milestone');
  if (payment.status === 'released') return { payment, freelancerPayout: payment.freelancerPayout };

  const platformFee = round2(payment.totalAmount * payment.feeRate);
  const freelancerPayout = round2(payment.totalAmount - platformFee);

  payment.platformFee = platformFee;
  payment.freelancerPayout = freelancerPayout;
  payment.status = 'released';
  payment.releasedAt = new Date();
  await payment.save();

  await FreelancerProfile.updateOne(
    { userId: contract.freelancerId },
    { $inc: { walletBalance: freelancerPayout, totalEarnings: Math.round(freelancerPayout) } }
  );

  milestone.status = 'released';
  milestone.releasedAt = new Date();
  await milestone.save();

  await ContractHistory.create({
    contractId: contract._id,
    action: auto ? 'milestone_auto_released' : 'milestone_released',
    newValue: { milestoneId: milestone._id, order: milestone.order, freelancerPayout }
  });

  notifications.onPaymentReleased(contract.freelancerId, { job, amount: freelancerPayout });
  if (auto) {
    notifications.onMilestoneAutoReleased(contract.clientId, { job, milestone });
  }

  return { payment, freelancerPayout };
}

/**
 * Approve a submitted milestone: release its escrow, and either advance the
 * contract to the next milestone or — if this was the last one — complete
 * the contract/job and roll up final stats. Shared by the manual "Approve"
 * action (delivery.controller.js's reviewDelivery) and the 7-day
 * auto-release cron, so this branching only lives in one place.
 *
 * @param {object} opts
 * @param {object} opts.milestone
 * @param {object} opts.contract
 * @param {object} opts.job
 * @param {boolean} [opts.auto] see releaseMilestone
 * @returns {Promise<{isLastMilestone: boolean, payment, freelancerPayout}>}
 */
async function approveMilestone({ milestone, contract, job, auto = false }) {
  const { payment, freelancerPayout } = await releaseMilestone({ milestone, contract, job, auto });
  const totalMilestones = await Milestone.countDocuments({ contractId: contract._id });
  const isLastMilestone = milestone.order >= totalMilestones;

  if (isLastMilestone) {
    contract.status = 'completed';
    contract.completedAt = new Date();
    await contract.save();

    if (job && job.status !== 'completed') {
      job.status = 'completed';
      job.completedAt = new Date();
      // releaseMilestone() already credited the freelancer's wallet/earnings
      // for this (final) milestone — only roll up completedProjects/totalSpent here.
      await finalizeJobCompletion(job, { freelancerEarning: freelancerPayout, clientSpend: payment.totalAmount, skipEarningsCredit: true });
    }

    notifications.onProjectCompleted(contract.freelancerId, { job: { _id: job?._id || contract.jobId } });
  } else {
    contract.status = 'active';
    contract.currentMilestoneOrder = milestone.order + 1;
    await contract.save();
  }

  return { isLastMilestone, payment, freelancerPayout };
}

module.exports = { fundMilestoneFromWallet, releaseMilestone, approveMilestone, getEscrowReleaseDays };
