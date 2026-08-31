const Contract = require('../models/Contract');
const ContractHistory = require('../models/ContractHistory');
const Job = require('../models/Job');
const Payment = require('../models/Payment');
const Milestone = require('../models/Milestone');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/apiError');
const notifications = require('../services/notification.service');
const { drawDownForTimeLog, refundRemainingHourlyEscrow } = require('../services/hourlyEscrow.service');

/**
 * Get contract details
 */
const getContract = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const contract = await Contract.findById(id)
    .populate('jobId')
    .populate('clientId', 'firstName lastName profilePicture')
    .populate('freelancerId', 'firstName lastName profilePicture');

  if (!contract) {
    throw new NotFoundError('Contract not found');
  }

  // Ensure user is part of the contract
  if (
    String(contract.clientId._id) !== String(req.user._id) &&
    String(contract.freelancerId._id) !== String(req.user._id)
  ) {
    throw new ForbiddenError('You do not have access to this contract');
  }

  let milestones = [];
  if (contract.type === 'fixed') {
    const Milestone = require('../models/Milestone');
    const rawMilestones = await Milestone.find({ contractId: contract._id }).sort({ order: 1 }).lean();
    const milestonePayments = await Payment.find({ milestoneId: { $in: rawMilestones.map((m) => m._id) } }).lean();
    const paymentByMilestone = new Map(milestonePayments.map((p) => [String(p.milestoneId), p]));
    milestones = rawMilestones.map((m) => ({ ...m, payment: paymentByMilestone.get(String(m._id)) || null }));
  }

  sendSuccess(res, { data: { contract, milestones } });
});

/**
 * Request contract cancellation (dispute)
 */
const requestCancellation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new BadRequestError('Cancellation reason is required');
  }

  const contract = await Contract.findById(id);
  if (!contract) {
    throw new NotFoundError('Contract not found');
  }

  // Check authorization
  const isClient = String(contract.clientId) === String(req.user._id);
  const isFreelancer = String(contract.freelancerId) === String(req.user._id);

  if (!isClient && !isFreelancer) {
    throw new ForbiddenError('You do not have permission to cancel this contract');
  }

  // Check if contract is already completed, cancelled or in dispute
  const lockedStatuses = ['completed', 'cancelled', 'pending_cancellation', 'under_review'];
  if (lockedStatuses.includes(contract.status)) {
    throw new BadRequestError(`Cannot cancel a contract that is ${contract.status}`);
  }

  // Stop the timer if it is active
  if (contract.timer && contract.timer.isActive) {
    const elapsedMs = Date.now() - new Date(contract.timer.startedAt).getTime();
    contract.timer.accumulatedMs += elapsedMs;
    contract.timer.isActive = false;
    contract.timer.startedAt = null;
  }

  // Change status
  const oldStatus = contract.status;
  contract.status = 'under_review'; // Directly to under_review for V1
  
  // NOTE: In V1, escrow funds remain frozen, no automatic refunds yet
  // No new manual time entries / payments will be allowed (checked in respective controllers)

  await contract.save();

  // Log history
  await ContractHistory.create({
    contractId: contract._id,
    action: 'status_changed',
    previousValue: { status: oldStatus },
    newValue: { status: contract.status, reason },
    performedBy: req.user._id
  });

  // Determine who to notify
  const notifyUserId = isClient ? contract.freelancerId : contract.clientId;
  const actorName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ');
  
  // Notify the other party
  notifications.onContractDisputed(notifyUserId, {
    contractId: contract._id,
    actorName,
    reason
  });

  sendSuccess(res, {
    message: 'Cancellation requested and contract is now under review',
    data: { contract }
  });
});

/**
 * Get contract history
 */
const getContractHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page, limit, skip } = parsePagination(req.query);

  const contract = await Contract.findById(id);
  if (!contract) {
    throw new NotFoundError('Contract not found');
  }

  if (
    String(contract.clientId) !== String(req.user._id) &&
    String(contract.freelancerId) !== String(req.user._id)
  ) {
    throw new ForbiddenError('You do not have access to this contract');
  }

  const history = await ContractHistory.find({ contractId: id })
    .populate('performedBy', 'firstName lastName profilePicture role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
  sendSuccess(res, { data: { history } });
});

/**
 * Get freelancer's own contracts
 */
const getMyContracts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const userId = req.user._id;
  const role = req.user.role;

  const query = role === 'freelancer' ? { freelancerId: userId } : { clientId: userId };
  const total = await Contract.countDocuments(query);
  const contracts = await Contract.find(query)
    .populate('jobId', 'title category')
    .populate('clientId', 'firstName lastName profilePicture')
    .populate('freelancerId', 'firstName lastName profilePicture')
    .skip(skip)
    .limit(limit)
    .sort({ updatedAt: -1 })
    .lean();

  const contractIds = contracts.map((c) => c._id);

  // Fixed-price contracts have ONE Payment per milestone (not one per
  // contract) — fetch milestones + their own escrow Payment together, and
  // key the legacy flat `payment` field off the CURRENT milestone specifically
  // (picking "any" Payment for the contract, as this used to, is ambiguous
  // and wrong once a contract has more than one milestone).
  const Milestone = require('../models/Milestone');
  const [payments, milestonesRaw] = await Promise.all([
    Payment.find({ contractId: { $in: contractIds } })
      .select('contractId milestoneId status depositAmount finalAmount totalAmount platformFee freelancerPayout')
      .lean(),
    Milestone.find({ contractId: { $in: contractIds } }).sort({ order: 1 }).lean()
  ]);

  const paymentByMilestone = new Map(payments.filter((p) => p.milestoneId).map((p) => [String(p.milestoneId), p]));
  const legacyPayByContract = new Map(payments.filter((p) => !p.milestoneId).map((p) => [String(p.contractId), p]));

  const milestonesByContract = new Map();
  for (const m of milestonesRaw) {
    const key = String(m.contractId);
    if (!milestonesByContract.has(key)) milestonesByContract.set(key, []);
    milestonesByContract.get(key).push({ ...m, payment: paymentByMilestone.get(String(m._id)) || null });
  }

  const TimeLog = require('../models/TimeLog');
  const recentLogs = await TimeLog.aggregate([
    { $match: { contractId: { $in: contractIds } } },
    { $sort: { endTime: -1 } },
    { $group: { _id: "$contractId", lastLog: { $first: "$$ROOT" }, totalDuration: { $sum: "$duration" } } }
  ]);
  const logsByContract = new Map(recentLogs.map((log) => [String(log._id), log]));

  const items = contracts.map((c) => {
    const logs = logsByContract.get(String(c._id)) || {};
    const milestones = milestonesByContract.get(String(c._id)) || [];
    const currentMilestone = milestones.find((m) => m.order === c.currentMilestoneOrder) || null;
    return {
      ...c,
      milestones,
      currentMilestone,
      payment: currentMilestone?.payment || legacyPayByContract.get(String(c._id)) || null,
      endRequest: c.endRequest || null,
      // Fixed-price disputes live on the current milestone, not the contract
      // (see raiseDispute below) — hourly still uses contract.dispute.
      dispute: (c.type === 'fixed' ? currentMilestone?.dispute : c.dispute) || null,
      lastTimeLog: logs.lastLog || null,
      totalDuration: logs.totalDuration || 0
    };
  });

  sendSuccess(res, { data: items, page, limit, total });
});

/**
 * Request to end an hourly contract
 */
const requestEndContract = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, additionalDetails } = req.body;

  const contract = await Contract.findById(id);
  if (!contract) throw new NotFoundError('Contract not found');

  if (contract.type !== 'hourly') {
    throw new BadRequestError('This action is only for hourly contracts');
  }

  const isClient = String(contract.clientId) === String(req.user._id);
  const isFreelancer = String(contract.freelancerId) === String(req.user._id);

  if (!isClient && !isFreelancer) {
    throw new ForbiddenError('You do not have permission to end this contract');
  }

  if (contract.status === 'completed' || contract.status === 'cancelled' || contract.status === 'under_review') {
    throw new BadRequestError(`Cannot end contract that is ${contract.status}`);
  }

  if (contract.endRequest && contract.endRequest.status === 'pending') {
    throw new BadRequestError('An end request is already pending for this contract');
  }

  contract.endRequest = {
    requestedBy: req.user._id,
    reason,
    additionalDetails: reason === 'Other' ? additionalDetails : undefined,
    status: 'pending',
    requestedAt: Date.now()
  };

  await contract.save();

  // Notify the other party
  const notifyUserId = isClient ? contract.freelancerId : contract.clientId;
  notifications.onContractStatusChanged(notifyUserId, {
    contractId: contract._id,
    status: 'end_requested'
  });

  sendSuccess(res, { message: 'End request sent successfully', data: { contract } });
});

/**
 * Respond to an end request
 */
const respondEndContract = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'

  const contract = await Contract.findById(id);
  if (!contract) throw new NotFoundError('Contract not found');

  if (contract.type !== 'hourly') {
    throw new BadRequestError('This action is only for hourly contracts');
  }

  if (!contract.endRequest || contract.endRequest.status !== 'pending') {
    throw new BadRequestError('No pending end request found');
  }

  const isClient = String(contract.clientId) === String(req.user._id);
  const isFreelancer = String(contract.freelancerId) === String(req.user._id);

  if (!isClient && !isFreelancer) {
    throw new ForbiddenError('You do not have permission');
  }

  // The responder must NOT be the requester
  if (String(contract.endRequest.requestedBy) === String(req.user._id)) {
    throw new BadRequestError('You cannot respond to your own request');
  }

  if (action === 'reject') {
    contract.endRequest.status = 'rejected';
    await contract.save();
    
    notifications.onContractStatusChanged(contract.endRequest.requestedBy, {
      contractId: contract._id,
      status: 'end_request_rejected'
    });

    return sendSuccess(res, { message: 'End request rejected', data: { contract } });
  }

  if (action === 'approve') {
    contract.status = 'completed';
    contract.completedAt = Date.now();
    contract.endRequest.status = 'approved';
    
    if (contract.timer && contract.timer.isActive) {
      contract.timer.isActive = false;
    }

    // Settle any pending time logs against the locked escrow (oldest first —
    // if the lock can't cover everything, whatever's left just stays
    // 'pending' rather than being falsely marked paid), then refund whatever
    // remains locked back to the client since the contract is now done.
    if (contract.type === 'hourly') {
      const TimeLog = require('../models/TimeLog');
      const job = await Job.findById(contract.jobId);
      const pendingLogs = await TimeLog.find({ contractId: contract._id, status: 'pending' }).sort({ startTime: 1 });

      for (const log of pendingLogs) {
        try {
          await drawDownForTimeLog({ timeLog: log, contract, job });
        } catch (err) {
          const reason = err.errors?.insufficientBalance ? 'escrow exhausted' : `unexpected error: ${err.message}`;
          console.error(`[respondEndContract] Could not settle time log ${log._id} (${reason})`);
          break;
        }
      }

      await refundRemainingHourlyEscrow({ contract, job });
    }

    await contract.save();
    
    await Job.findByIdAndUpdate(contract.jobId, { status: 'completed' });

    await ContractHistory.create({
      contractId: contract._id,
      action: 'status_change',
      performedBy: req.user._id,
      notes: 'Contract mutually ended',
      previousValue: 'active',
      newValue: 'completed'
    });

    const notifyUserId = isClient ? contract.freelancerId : contract.clientId;
    notifications.onContractStatusChanged(notifyUserId, {
      contractId: contract._id,
      status: 'completed'
    });

    return sendSuccess(res, { message: 'Contract completed successfully', data: { contract } });
  }

  throw new BadRequestError('Invalid action');
});

/**
 * Raise a Dispute — hourly contracts dispute at the contract level (as
 * before); fixed-price contracts dispute the CURRENT milestone (the one
 * being submitted/reviewed), freezing just that milestone's escrow rather
 * than the whole contract.
 */
const raiseDispute = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, description } = req.body;

  const contract = await Contract.findById(id);
  if (!contract) throw new NotFoundError('Contract not found');

  const isClient = String(contract.clientId) === String(req.user._id);
  const isFreelancer = String(contract.freelancerId) === String(req.user._id);

  if (!isClient && !isFreelancer) {
    throw new ForbiddenError('You do not have permission to dispute this contract');
  }

  if (contract.type === 'fixed') {
    const milestone = await Milestone.findOne({ contractId: contract._id, order: contract.currentMilestoneOrder });
    if (!milestone) throw new NotFoundError('No milestone found for this contract');
    if (!['submitted', 'in_revision'].includes(milestone.status)) {
      throw new BadRequestError(`Cannot dispute a milestone that is ${milestone.status} — there must be delivered work under review to dispute.`);
    }
    if (milestone.dispute?.status === 'pending') {
      throw new BadRequestError('This milestone already has a pending dispute');
    }

    milestone.status = 'disputed';
    // Clear reviewDeadline so the auto-release cron (which only scans
    // status:'submitted') can never touch a disputed milestone.
    milestone.reviewDeadline = undefined;
    milestone.dispute = {
      raisedBy: req.user._id,
      reason,
      description,
      status: 'pending',
      raisedAt: new Date()
    };
    await milestone.save();

    contract.status = 'under_review';
    await contract.save();

    await ContractHistory.create({
      contractId: contract._id,
      action: 'milestone_disputed',
      performedBy: req.user._id,
      notes: `Dispute raised on milestone ${milestone.order}: ${reason}`,
      newValue: { milestoneId: milestone._id, order: milestone.order }
    });

    const notifyUserId = isClient ? contract.freelancerId : contract.clientId;
    notifications.onContractDisputed(notifyUserId, { contractId: contract._id, actorName: req.user.firstName, reason });

    return sendSuccess(res, { message: 'Dispute raised successfully', data: { contract, milestone } });
  }

  // Hourly contracts — unchanged, contract-level dispute.
  const lockedStatuses = ['completed', 'cancelled', 'pending_cancellation', 'under_review'];
  if (lockedStatuses.includes(contract.status)) {
    throw new BadRequestError(`Cannot dispute a contract that is ${contract.status}`);
  }

  contract.status = 'under_review';
  if (contract.timer && contract.timer.isActive) {
    contract.timer.isActive = false;
  }

  contract.dispute = {
    raisedBy: req.user._id,
    reason,
    description,
    status: 'pending',
    raisedAt: Date.now()
  };

  // Clear any pending end requests
  if (contract.endRequest && contract.endRequest.status === 'pending') {
    contract.endRequest.status = 'rejected';
  }

  await contract.save();

  await ContractHistory.create({
    contractId: contract._id,
    action: 'status_change',
    performedBy: req.user._id,
    notes: `Dispute raised: ${reason}`,
    previousValue: 'active',
    newValue: 'under_review'
  });

  const notifyUserId = isClient ? contract.freelancerId : contract.clientId;
  notifications.onContractDisputed(notifyUserId, {
    contractId: contract._id,
    actorName: req.user.firstName,
    reason
  });

  sendSuccess(res, { message: 'Dispute raised successfully', data: { contract } });
});

/**
 * Admin: Resolve Dispute (Future API hook)
 */
const adminResolveDispute = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { outcome, resolutionNotes } = req.body; // e.g. 'release_freelancer', 'refund_client', 'split', 'resume'

  // Admin authorization would normally happen in middleware
  // For now, this is just a skeleton for future admin dashboard
  
  const contract = await Contract.findById(id);
  if (!contract) throw new NotFoundError('Contract not found');

  if (!contract.dispute || contract.dispute.status !== 'pending') {
    throw new BadRequestError('No pending dispute found');
  }

  if (outcome === 'resume') {
    contract.status = 'active';
  } else {
    contract.status = 'completed'; // or cancelled
    contract.completedAt = Date.now();
  }

  contract.dispute.status = 'resolved';
  contract.dispute.resolutionNotes = resolutionNotes;
  contract.dispute.resolvedBy = req.user._id; // Admin ID
  contract.dispute.resolvedAt = Date.now();

  await contract.save();

  // (Future logic: process wallet transfers atomically here)

  sendSuccess(res, { message: 'Dispute resolved successfully', data: { contract } });
});

module.exports = {
  getContract,
  requestCancellation,
  getContractHistory,
  getMyContracts,
  requestEndContract,
  respondEndContract,
  raiseDispute,
  adminResolveDispute
};
