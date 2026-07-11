const Contract = require('../models/Contract');
const ContractHistory = require('../models/ContractHistory');
const Job = require('../models/Job');
const Payment = require('../models/Payment');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/apiError');
const notifications = require('../services/notification.service');
const { PLATFORM_FEE_RATE, round2 } = require('../utils/constants');

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

  sendSuccess(res, { data: { contract } });
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

  // Attach each contract's payment record
  const payments = await Payment.find({ contractId: { $in: contracts.map((c) => c._id) } })
    .select('contractId status depositAmount finalAmount totalAmount platformFee freelancerPayout')
    .lean();
  const payByContract = new Map(payments.map((p) => [String(p.contractId), p]));

  const TimeLog = require('../models/TimeLog');
  const recentLogs = await TimeLog.aggregate([
    { $match: { contractId: { $in: contracts.map((c) => c._id) } } },
    { $sort: { endTime: -1 } },
    { $group: { _id: "$contractId", lastLog: { $first: "$$ROOT" }, totalDuration: { $sum: "$duration" } } }
  ]);
  const logsByContract = new Map(recentLogs.map((log) => [String(log._id), log]));

  const items = contracts.map((c) => {
    const logs = logsByContract.get(String(c._id)) || {};
    return {
      ...c,
      payment: payByContract.get(String(c._id)) || null,
      endRequest: c.endRequest || null,
      dispute: c.dispute || null,
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

    // Process immediate payment for any pending time logs
    if (contract.type === 'hourly') {
      const TimeLog = require('../models/TimeLog');
      const pendingLogs = await TimeLog.find({ contractId: contract._id, status: 'pending' });
      
      if (pendingLogs.length > 0) {
        const totalDurationMs = pendingLogs.reduce((sum, log) => sum + log.duration, 0);
        const totalHours = totalDurationMs / (1000 * 60 * 60);
        const amount = totalHours * contract.hourlyRate;
        
        if (amount > 0.01) {
          await Payment.create({
            jobId: contract.jobId,
            contractId: contract._id,
            clientId: contract.clientId,
            freelancerId: contract.freelancerId,
            type: 'hourly_invoice',
            totalAmount: round2(amount),
            depositAmount: round2(amount),
            finalAmount: round2(amount),
            feeRate: PLATFORM_FEE_RATE,
            platformFee: round2(amount * PLATFORM_FEE_RATE),
            freelancerPayout: round2(amount * (1 - PLATFORM_FEE_RATE)),
            status: 'released',
          });
        }

        await TimeLog.updateMany(
          { _id: { $in: pendingLogs.map(l => l._id) } },
          { $set: { status: 'billed', approvedBy: null } }
        );
      }

      // Release any previously generated unpaid invoices for this contract, regardless of whether there are new pending logs
      await Payment.updateMany(
        { contractId: contract._id, status: { $in: ['deposit_pending', 'escrow_funded'] } },
        { $set: { status: 'released' } }
      );
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
 * Raise a Dispute for Hourly Contract
 */
const raiseDispute = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, description } = req.body;

  const contract = await Contract.findById(id);
  if (!contract) throw new NotFoundError('Contract not found');

  if (contract.type !== 'hourly') {
    throw new BadRequestError('This action is only for hourly contracts');
  }

  const isClient = String(contract.clientId) === String(req.user._id);
  const isFreelancer = String(contract.freelancerId) === String(req.user._id);

  if (!isClient && !isFreelancer) {
    throw new ForbiddenError('You do not have permission to dispute this contract');
  }

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
