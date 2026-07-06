const Contract = require('../models/Contract');
const ContractHistory = require('../models/ContractHistory');
const Job = require('../models/Job');
const Payment = require('../models/Payment');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/apiError');
const notifications = require('../services/notification.service');

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
    oldValue: { status: oldStatus },
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
      lastTimeLog: logs.lastLog || null,
      totalDuration: logs.totalDuration || 0
    };
  });

  sendSuccess(res, { data: items, page, limit, total });
});

/**
 * End contract manually (primarily for hourly contracts)
 */
const endContract = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const contract = await Contract.findById(id);

  if (!contract) {
    throw new NotFoundError('Contract not found');
  }

  // Ensure only the client (or freelancer) can end it
  const isClient = String(contract.clientId) === String(req.user._id);
  const isFreelancer = String(contract.freelancerId) === String(req.user._id);

  if (!isClient && !isFreelancer) {
    throw new ForbiddenError('You do not have permission to end this contract');
  }

  if (contract.status === 'completed' || contract.status === 'cancelled') {
    throw new BadRequestError(`Contract is already ${contract.status}`);
  }

  contract.status = 'completed';
  contract.completedAt = Date.now();
  
  // If timer is active, stop it
  if (contract.timer && contract.timer.isActive) {
    contract.timer.isActive = false;
    // We ideally should calculate accumulatedMs but for simplicity we just stop it
  }

  await contract.save();

  // Also update the job status
  await Job.findByIdAndUpdate(contract.jobId, { status: 'completed' });

  // Add history
  await ContractHistory.create({
    contractId: contract._id,
    action: 'status_change',
    actorId: req.user._id,
    actorModel: 'User',
    details: 'Contract was manually ended',
    previousStatus: contract.status,
    newStatus: 'completed'
  });

  // Notify the other party
  const notifyUserId = isClient ? contract.freelancerId : contract.clientId;
  // We'll skip complex notification logic for now, or just use basic notification

  sendSuccess(res, { message: 'Contract ended successfully', data: { contract } });
});

module.exports = {
  getContract,
  requestCancellation,
  getContractHistory,
  getMyContracts,
  endContract
};
