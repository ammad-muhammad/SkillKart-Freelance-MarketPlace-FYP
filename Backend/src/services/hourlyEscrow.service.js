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
const { getPlatformFeeRate, round2 } = require('../utils/constants');
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

  // Atomic conditional debit — see milestone.service.js's fundMilestoneFromWallet
  // for why a plain read-then-write here is unsafe under concurrent requests
  // (e.g. an accept + a manual top-up landing close together).
  const updatedProfile = await ClientProfile.findOneAndUpdate(
    { userId: clientId, walletBalance: { $gte: lockAmount } },
    { $inc: { walletBalance: -lockAmount } },
    { new: true }
  );
  if (!updatedProfile) {
    const clientProfile = await ClientProfile.findOne({ userId: clientId }).lean();
    const balance = clientProfile?.walletBalance || 0;
    throw new BadRequestError(
      `Insufficient wallet balance to lock escrow for this hourly contract. Need Rs. ${lockAmount}, have Rs. ${round2(balance)}. Please top up your wallet first.`,
      { insufficientBalance: true, required: lockAmount, available: round2(balance), contractType: 'hourly' }
    );
  }

  const payment = await Payment.create({
    jobId: job._id,
    contractId: contract._id,
    clientId,
    freelancerId: contract.freelancerId,
    type: 'hourly_escrow',
    totalAmount: lockAmount,
    depositAmount: lockAmount,
    finalAmount: lockAmount,
    feeRate: await getPlatformFeeRate(),
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
  const TimeLog = require('../models/TimeLog');

  // Atomically claim the log itself FIRST — a plain `timeLog.save()` at the
  // end of this function (the old code) has no precondition, so two
  // concurrent callers racing on the same still-'pending' log (e.g. the
  // catch-up loop in lockHourlyContract firing alongside the weekly-invoice
  // cron, or a manual log racing a timer-stop) would both sail through and
  // both pay it out. Only one caller can win this claim; the other exits
  // immediately, before touching any money.
  const claimed = await TimeLog.findOneAndUpdate(
    { _id: timeLog._id, status: 'pending' },
    { $set: { status: 'billed', approvedAt: new Date() } },
    { new: true }
  );
  if (!claimed) {
    // Already billed (or otherwise no longer pending) by a concurrent call.
    return { amount: 0, payment: null };
  }

  const hours = (timeLog.duration || 0) / 3600000; // ms -> hours
  const amount = round2(hours * (contract.hourlyRate || 0));

  if (amount <= 0) {
    return { amount: 0, payment: null };
  }

  // Atomically draw down the lock — a plain read-then-write on
  // contract.hourlyEscrow.lockedBalance (read here, contract.save() below)
  // would let two concurrent draw-downs (e.g. a manual log and a timer-stop
  // landing close together) both pass this check against the same stale
  // in-memory value; whichever contract.save() lands last would silently
  // clobber the other's decrement, understating how much has actually been
  // drawn and letting the freelancer eventually get paid beyond what the
  // client ever locked. This conditional update can only succeed if the lock
  // still covers the amount at the moment it runs.
  const Contract = require('../models/Contract');
  const updatedContract = await Contract.findOneAndUpdate(
    { _id: contract._id, 'hourlyEscrow.lockedBalance': { $gte: amount } },
    { $inc: { 'hourlyEscrow.lockedBalance': -amount, 'hourlyEscrow.totalDrawn': amount } },
    { new: true }
  );
  if (!updatedContract) {
    // Couldn't fund it after all — release our claim on the log so it goes
    // back to 'pending' and can be retried once the client tops up, instead
    // of being stuck 'billed' with no payment ever created for it.
    await TimeLog.updateOne({ _id: timeLog._id }, { $set: { status: 'pending' }, $unset: { approvedAt: '' } });
    const fresh = await Contract.findById(contract._id).select('hourlyEscrow').lean();
    const lockedBalance = fresh?.hourlyEscrow?.lockedBalance || 0;
    throw new BadRequestError(
      `Escrow balance too low to bill this logged time (need Rs. ${amount}, have Rs. ${round2(lockedBalance)} locked).`,
      { insufficientBalance: true, required: amount, available: round2(lockedBalance), contractType: 'hourly' }
    );
  }
  contract.hourlyEscrow.lockedBalance = updatedContract.hourlyEscrow.lockedBalance;
  contract.hourlyEscrow.totalDrawn = updatedContract.hourlyEscrow.totalDrawn;

  const feeRate = await getPlatformFeeRate();
  const platformFee = round2(amount * feeRate);
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
    feeRate,
    platformFee,
    freelancerPayout,
    status: 'released',
    depositPaidAt: new Date(),
    releasedAt: new Date(),
    stripe: { simulated: true }
  });

  await FreelancerProfile.updateOne(
    { userId: contract.freelancerId },
    { $inc: { walletBalance: freelancerPayout, totalEarnings: Math.round(freelancerPayout) } }
  );

  timeLog.status = 'billed';
  timeLog.approvedAt = claimed.approvedAt;

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
  // Atomically read-and-zero the lock — a plain read-then-write (read
  // lockedBalance, later set it to 0 via contract.save()) would let two
  // concurrent calls (e.g. a double-clicked "confirm end contract") both
  // read the same non-zero balance and both credit the client's wallet for
  // it before either save() lands. The $gt:0 guard means only the first
  // caller can ever succeed; new:false returns the pre-update document so we
  // still get the real amount that was locked.
  const Contract = require('../models/Contract');
  const before = await Contract.findOneAndUpdate(
    { _id: contract._id, 'hourlyEscrow.lockedBalance': { $gt: 0 } },
    { $set: { 'hourlyEscrow.lockedBalance': 0 } },
    { new: false }
  );
  const remaining = round2(before?.hourlyEscrow?.lockedBalance || 0);
  if (remaining <= 0) return 0;
  contract.hourlyEscrow.lockedBalance = 0;

  await ClientProfile.updateOne(
    { userId: contract.clientId },
    { $inc: { walletBalance: remaining } }
  );

  await ContractHistory.create({
    contractId: contract._id,
    action: 'hourly_escrow_refunded',
    newValue: { amount: remaining }
  });

  notifications.onEscrowRefunded(contract.clientId, { amount: remaining, job });

  return remaining;
}

/**
 * Release whatever remains in an hourly contract's lock straight to the
 * freelancer's wallet (minus platform fee) — used by admin dispute
 * resolution's "release to freelancer" action. Unlike drawDownForTimeLog,
 * this isn't tied to a specific TimeLog; it settles the contract's entire
 * outstanding lock in one shot, since a dispute resolution is a final
 * decision on the disputed funds, not a per-hour billing event.
 */
async function releaseRemainingHourlyEscrow({ contract, job }) {
  // Atomic read-and-zero — see refundRemainingHourlyEscrow for why a plain
  // read-then-write here would let a double-submitted dispute resolution
  // credit the freelancer twice for the same locked funds.
  const Contract = require('../models/Contract');
  const before = await Contract.findOneAndUpdate(
    { _id: contract._id, 'hourlyEscrow.lockedBalance': { $gt: 0 } },
    { $set: { 'hourlyEscrow.lockedBalance': 0 } },
    { new: false }
  );
  const remaining = round2(before?.hourlyEscrow?.lockedBalance || 0);
  if (remaining <= 0) return { amount: 0, freelancerPayout: 0, payment: null };
  contract.hourlyEscrow.lockedBalance = 0;

  const feeRate = await getPlatformFeeRate();
  const platformFee = round2(remaining * feeRate);
  const freelancerPayout = round2(remaining - platformFee);

  const payment = await Payment.create({
    jobId: job?._id,
    contractId: contract._id,
    clientId: contract.clientId,
    freelancerId: contract.freelancerId,
    type: 'hourly_invoice',
    totalAmount: remaining,
    depositAmount: remaining,
    finalAmount: remaining,
    feeRate,
    platformFee,
    freelancerPayout,
    status: 'released',
    depositPaidAt: new Date(),
    releasedAt: new Date(),
    stripe: { simulated: true }
  });

  // lockedBalance is already zeroed atomically above; totalDrawn is a
  // display/audit counter only, so a plain atomic $inc (no read needed) is
  // enough — left untouched on the in-memory `contract` so the caller's
  // later contract.save() (for contract.status) doesn't re-dirty and
  // overwrite it with a stale value.
  await Contract.updateOne({ _id: contract._id }, { $inc: { 'hourlyEscrow.totalDrawn': remaining } });

  await FreelancerProfile.updateOne(
    { userId: contract.freelancerId },
    { $inc: { walletBalance: freelancerPayout, totalEarnings: Math.round(freelancerPayout) } }
  );

  await ContractHistory.create({
    contractId: contract._id,
    action: 'hourly_escrow_released',
    newValue: { amount: remaining, freelancerPayout }
  });

  notifications.onPaymentReleased(contract.freelancerId, { job, amount: freelancerPayout });

  return { amount: remaining, freelancerPayout, payment };
}

/**
 * Split whatever remains in an hourly contract's lock between freelancer and
 * client by percentage — used by admin dispute resolution's "split" action.
 * `freelancerPercent` is validated by the caller (1-99) before this runs.
 */
async function splitRemainingHourlyEscrow({ contract, job, freelancerPercent }) {
  // Atomic read-and-zero — see refundRemainingHourlyEscrow for why a plain
  // read-then-write here would let a double-submitted dispute resolution
  // double-pay both parties for the same locked funds.
  const Contract = require('../models/Contract');
  const before = await Contract.findOneAndUpdate(
    { _id: contract._id, 'hourlyEscrow.lockedBalance': { $gt: 0 } },
    { $set: { 'hourlyEscrow.lockedBalance': 0 } },
    { new: false }
  );
  const remaining = round2(before?.hourlyEscrow?.lockedBalance || 0);
  if (remaining <= 0) return { amount: 0, freelancerPayout: 0, clientRefund: 0, payment: null };
  contract.hourlyEscrow.lockedBalance = 0;

  const freelancerShare = round2(remaining * (freelancerPercent / 100));
  const clientRefund = round2(remaining - freelancerShare);
  const feeRate = await getPlatformFeeRate();
  const platformFee = round2(freelancerShare * feeRate);
  const freelancerPayout = round2(freelancerShare - platformFee);

  const payment = await Payment.create({
    jobId: job?._id,
    contractId: contract._id,
    clientId: contract.clientId,
    freelancerId: contract.freelancerId,
    type: 'hourly_invoice',
    totalAmount: freelancerShare,
    depositAmount: freelancerShare,
    finalAmount: freelancerShare,
    feeRate,
    platformFee,
    freelancerPayout,
    status: 'released',
    depositPaidAt: new Date(),
    releasedAt: new Date(),
    stripe: { simulated: true }
  });

  // Same rationale as releaseRemainingHourlyEscrow's tail: lockedBalance is
  // already zeroed atomically above; totalDrawn is inc'd directly in the DB
  // and left untouched in-memory so the caller's later contract.save() (for
  // contract.status) can't clobber it with a stale value.
  await Contract.updateOne({ _id: contract._id }, { $inc: { 'hourlyEscrow.totalDrawn': freelancerShare } });

  await FreelancerProfile.updateOne(
    { userId: contract.freelancerId },
    { $inc: { walletBalance: freelancerPayout, totalEarnings: Math.round(freelancerPayout) } }
  );
  if (clientRefund > 0) {
    await ClientProfile.updateOne({ userId: contract.clientId }, { $inc: { walletBalance: clientRefund } });
  }

  await ContractHistory.create({
    contractId: contract._id,
    action: 'hourly_escrow_split',
    newValue: { amount: remaining, freelancerPayout, clientRefund }
  });

  notifications.onPaymentReleased(contract.freelancerId, { job, amount: freelancerPayout });

  return { amount: remaining, freelancerPayout, clientRefund, payment };
}

module.exports = {
  estimateWeeklyLockAmount,
  lockHourlyEscrow,
  drawDownForTimeLog,
  getUnbilledAmount,
  refundRemainingHourlyEscrow,
  releaseRemainingHourlyEscrow,
  splitRemainingHourlyEscrow
};
