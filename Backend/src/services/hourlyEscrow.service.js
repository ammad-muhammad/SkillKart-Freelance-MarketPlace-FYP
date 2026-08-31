/**
 * hourlyEscrow.service.js — wallet-lock escrow for HOURLY contracts, the
 * hourly counterpart to milestone.service.js's fixed-price milestone escrow.
 *
 * Replaces the old (never-actually-collecting) weekly-invoice/50-50-deposit
 * flow: the client locks one week's estimate (hourlyRate * weeklyLimit) from
 * their wallet at accept time. As the freelancer logs hours, each log is
 * drawn down from that lock and paid straight to the freelancer's wallet
 * (minus the platform fee). When the lock runs low, new time-tracking is
 * blocked (see timeTracking.controller.js) until the client re-locks
 * (tops up) via lockHourlyEscrow again.
 */
const ClientProfile = require('../models/ClientProfile');
const FreelancerProfile = require('../models/FreelancerProfile');
const Payment = require('../models/Payment');
const ContractHistory = require('../models/ContractHistory');
const notifications = require('./notification.service');
const { PLATFORM_FEE_RATE, round2 } = require('../utils/constants');
const { BadRequestError } = require('../utils/apiError');

/**
 * One week's estimated cost for an hourly hire — the amount locked at accept
 * time, and the default amount offered when re-locking later.
 */
function estimateWeeklyLockAmount({ hourlyRate, weeklyLimit }) {
  const rate = Number(hourlyRate) || 0;
  const hours = Number(weeklyLimit) || 0;
  return round2(rate * hours);
}

/**
 * Lock `amount` from the client's wallet into the contract's running
 * hourlyEscrow balance. Used both at accept time (initial lock) and whenever
 * the client tops up because the balance ran low (re-lock).
 *
 * Throws BadRequestError (with structured `errors` data the frontend can key
 * off — see acceptProposal/lockHourly for the { insufficientBalance } shape)
 * on insufficient balance. Callers must not have made related writes before
 * calling this that they can't leave in a sane, retryable state if it throws
 * — this app has no Mongo transactions, so correctness comes from ordering.
 */
async function lockHourlyEscrow({ contract, job, clientId, amount, performedBy, initial = false }) {
  const lockAmount = round2(amount);
  if (lockAmount <= 0) {
    throw new BadRequestError('Lock amount must be greater than zero');
  }

  const clientProfile = await ClientProfile.findOne({ userId: clientId });
  const balance = clientProfile?.walletBalance || 0;
  if (balance < lockAmount) {
    throw new BadRequestError(
      `Insufficient wallet balance to lock escrow for this hourly contract. Need Rs. ${lockAmount}, have Rs. ${round2(balance)}. Please top up your wallet first.`,
      { insufficientBalance: true, required: lockAmount, available: round2(balance), contractType: 'hourly' }
    );
  }

  clientProfile.walletBalance = round2(balance - lockAmount);
  await clientProfile.save();

  const payment = await Payment.create({
    jobId: job._id,
    contractId: contract._id,
    clientId,
    freelancerId: contract.freelancerId,
    type: 'hourly_escrow',
    totalAmount: lockAmount,
    depositAmount: lockAmount,
    finalAmount: lockAmount,
    feeRate: PLATFORM_FEE_RATE,
    status: 'deposit_paid',
    depositPaidAt: new Date(),
    stripe: { simulated: true }
  });

  contract.hourlyEscrow.lockedBalance = round2((contract.hourlyEscrow.lockedBalance || 0) + lockAmount);
  contract.hourlyEscrow.totalLocked = round2((contract.hourlyEscrow.totalLocked || 0) + lockAmount);
  contract.hourlyEscrow.lastLockedAt = new Date();
  contract.paymentStatus = 'wallet_locked';
  await contract.save();

  await ContractHistory.create({
    contractId: contract._id,
    action: initial ? 'hourly_escrow_locked' : 'hourly_escrow_relocked',
    newValue: { amount: lockAmount, lockedBalance: contract.hourlyEscrow.lockedBalance },
    performedBy
  });

  notifications.onDepositFunded(contract.freelancerId, { job });

  return payment;
}

/**
 * Draw down a single TimeLog's cost from the contract's locked balance and
 * pay it straight to the freelancer's wallet (minus platform fee) — the
 * hourly equivalent of releaseMilestone. Only succeeds if the lock can fully
 * cover the log's amount; throws BadRequestError otherwise so the caller can
 * leave the TimeLog 'pending' and retry later (e.g. after a re-lock).
 */
async function drawDownForTimeLog({ timeLog, contract, job }) {
  const hours = (timeLog.duration || 0) / 3600000; // ms -> hours
  const amount = round2(hours * (contract.hourlyRate || 0));

  if (amount <= 0) {
    timeLog.status = 'billed';
    await timeLog.save();
    return { amount: 0, payment: null };
  }

  const lockedBalance = contract.hourlyEscrow?.lockedBalance || 0;
  if (lockedBalance < amount) {
    throw new BadRequestError(
      `Escrow balance too low to bill this logged time (need Rs. ${amount}, have Rs. ${round2(lockedBalance)} locked).`,
      { insufficientBalance: true, required: amount, available: round2(lockedBalance), contractType: 'hourly' }
    );
  }

  const platformFee = round2(amount * PLATFORM_FEE_RATE);
  const freelancerPayout = round2(amount - platformFee);

  const payment = await Payment.create({
    jobId: job._id,
    contractId: contract._id,
    clientId: contract.clientId,
    freelancerId: contract.freelancerId,
    type: 'hourly_invoice',
    totalAmount: amount,
    depositAmount: amount,
    finalAmount: amount,
    feeRate: PLATFORM_FEE_RATE,
    platformFee,
    freelancerPayout,
    status: 'released',
    depositPaidAt: new Date(),
    releasedAt: new Date(),
    stripe: { simulated: true }
  });

  contract.hourlyEscrow.lockedBalance = round2(lockedBalance - amount);
  contract.hourlyEscrow.totalDrawn = round2((contract.hourlyEscrow.totalDrawn || 0) + amount);
  await contract.save();

  await FreelancerProfile.updateOne(
    { userId: contract.freelancerId },
    { $inc: { walletBalance: freelancerPayout, totalEarnings: Math.round(freelancerPayout) } }
  );

  timeLog.status = 'billed';
  timeLog.approvedAt = new Date();
  await timeLog.save();

  notifications.onPaymentReleased(contract.freelancerId, { job, amount: freelancerPayout });

  return { amount, payment };
}

/**
 * Sum of still-`pending` (not yet billed) TimeLogs for a contract, converted
 * to a Rupee amount at the contract's hourly rate — i.e. how much work is
 * "on credit" against the current lock right now.
 */
async function getUnbilledAmount(contract) {
  const TimeLog = require('../models/TimeLog');
  const pending = await TimeLog.find({ contractId: contract._id, status: 'pending' }).select('duration').lean();
  const totalMs = pending.reduce((sum, log) => sum + (log.duration || 0), 0);
  return round2((totalMs / 3600000) * (contract.hourlyRate || 0));
}

/**
 * Refund whatever remains in an hourly contract's lock back to the client's
 * wallet — a lock is a hold, not a spend, so unearned funds return to the
 * client when the contract ends (completed or cancelled).
 */
async function refundRemainingHourlyEscrow({ contract, job }) {
  const remaining = round2(contract.hourlyEscrow?.lockedBalance || 0);
  if (remaining <= 0) return 0;

  await ClientProfile.updateOne(
    { userId: contract.clientId },
    { $inc: { walletBalance: remaining } }
  );

  contract.hourlyEscrow.lockedBalance = 0;
  await contract.save();

  await ContractHistory.create({
    contractId: contract._id,
    action: 'hourly_escrow_refunded',
    newValue: { amount: remaining }
  });

  notifications.onEscrowRefunded(contract.clientId, { amount: remaining, job });

  return remaining;
}

module.exports = {
  estimateWeeklyLockAmount,
  lockHourlyEscrow,
  drawDownForTimeLog,
  getUnbilledAmount,
  refundRemainingHourlyEscrow
};
