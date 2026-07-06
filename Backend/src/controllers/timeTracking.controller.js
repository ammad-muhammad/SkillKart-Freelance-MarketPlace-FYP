const Contract = require('../models/Contract');
const TimeLog = require('../models/TimeLog');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/apiError');

const LOCKED_STATUSES = ['completed', 'cancelled', 'pending_cancellation', 'under_review'];

/**
 * Start the timer for an hourly contract
 */
const startTimer = asyncHandler(async (req, res) => {
  const { contractId } = req.params;

  const contract = await Contract.findById(contractId);
  if (!contract) throw new NotFoundError('Contract not found');

  if (String(contract.freelancerId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the assigned freelancer can track time');
  }

  if (contract.type !== 'hourly') {
    throw new BadRequestError('Timer can only be used on hourly contracts');
  }

  if (LOCKED_STATUSES.includes(contract.status)) {
    throw new BadRequestError(`Cannot start timer, contract is ${contract.status}`);
  }

  if (contract.timer && contract.timer.isActive) {
    throw new BadRequestError('Timer is already running');
  }

  contract.timer = {
    ...contract.timer,
    isActive: true,
    startedAt: new Date()
  };

  await contract.save();

  sendSuccess(res, {
    message: 'Timer started',
    data: { timer: contract.timer }
  });
});

/**
 * Stop the timer and save the log
 */
const stopTimer = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { notes } = req.body;

  const contract = await Contract.findById(contractId);
  if (!contract) throw new NotFoundError('Contract not found');

  if (String(contract.freelancerId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the assigned freelancer can track time');
  }

  if (!contract.timer || !contract.timer.isActive) {
    throw new BadRequestError('Timer is not currently running');
  }

  const startTime = new Date(contract.timer.startedAt);
  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  
  if (durationMs < 60000) {
    // If less than 1 minute, just reset timer
    contract.timer.isActive = false;
    contract.timer.startedAt = null;
    await contract.save();
    return sendSuccess(res, {
      message: 'Timer stopped (duration too short to log)',
      data: { timer: contract.timer }
    });
  }

  // Create log
  const log = await TimeLog.create({
    contractId: contract._id,
    jobId: contract.jobId,
    clientId: contract.clientId,
    freelancerId: contract.freelancerId,
    duration: durationMs,
    startTime,
    endTime,
    date: startTime,
    source: 'timer',
    notes: notes || '',
    createdBy: req.user._id,
    status: 'pending' // awaits client approval or auto-approval
  });

  // Reset timer
  contract.timer.isActive = false;
  contract.timer.startedAt = null;
  contract.timer.accumulatedMs += durationMs;
  await contract.save();

  sendSuccess(res, {
    message: 'Timer stopped and time logged successfully',
    data: { timer: contract.timer, log }
  });
});

/**
 * Add manual time log
 */
const addManualLog = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { startTime, endTime, notes } = req.body;

  if (!startTime || !endTime) {
    throw new BadRequestError('startTime and endTime are required');
  }

  const contract = await Contract.findById(contractId);
  if (!contract) throw new NotFoundError('Contract not found');

  if (String(contract.freelancerId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the assigned freelancer can track time');
  }

  if (contract.type !== 'hourly') {
    throw new BadRequestError('Manual time logs are only for hourly contracts');
  }

  if (LOCKED_STATUSES.includes(contract.status)) {
    throw new BadRequestError(`Cannot add manual time, contract is ${contract.status}`);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();

  if (durationMs <= 0) {
    throw new BadRequestError('endTime must be after startTime');
  }

  // Check for overlapping logs
  const overlapping = await TimeLog.findOne({
    contractId: contract._id,
    $or: [
      { startTime: { $lt: end, $gte: start } },
      { endTime: { $gt: start, $lte: end } },
      { startTime: { $lte: start }, endTime: { $gte: end } }
    ]
  });

  if (overlapping) {
    throw new BadRequestError('This time period overlaps with an existing time log');
  }

  const log = await TimeLog.create({
    contractId: contract._id,
    jobId: contract.jobId,
    clientId: contract.clientId,
    freelancerId: contract.freelancerId,
    duration: durationMs,
    startTime: start,
    endTime: end,
    date: start,
    source: 'manual',
    notes: notes || '',
    createdBy: req.user._id,
    status: 'pending'
  });

  sendSuccess(res, {
    message: 'Manual time logged successfully',
    data: { log },
    statusCode: 201
  });
});

/**
 * Get time logs for contract
 */
const getContractLogs = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { page, limit, skip } = parsePagination(req.query);

  const contract = await Contract.findById(contractId);
  if (!contract) throw new NotFoundError('Contract not found');

  if (
    String(contract.clientId) !== String(req.user._id) &&
    String(contract.freelancerId) !== String(req.user._id)
  ) {
    throw new ForbiddenError('You do not have access to these logs');
  }

  const logs = await TimeLog.find({ contractId })
    .sort({ startTime: -1 })
    .skip(skip)
    .limit(limit);

  sendSuccess(res, { data: { logs } });
});

module.exports = {
  startTimer,
  stopTimer,
  addManualLog,
  getContractLogs
};
