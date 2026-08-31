const Contract = require('../models/Contract');
const Job = require('../models/Job');
const TimeLog = require('../models/TimeLog');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/apiError');
const { getUnbilledAmount, drawDownForTimeLog } = require('../services/hourlyEscrow.service');

const LOCKED_STATUSES = ['completed', 'cancelled', 'pending_cancellation', 'under_review'];

// Block new time-tracking once already-logged-but-unbilled work would meet or
// exceed what's currently locked in escrow — the freelancer shouldn't keep
// working "on credit" past what the client has actually secured.
const assertEscrowHasRoom = async (contract) => {
  const lockedBalance = contract.hourlyEscrow?.lockedBalance || 0;
  const unbilled = await getUnbilledAmount(contract);
  if (unbilled >= lockedBalance) {
    throw new BadRequestError(
      `Escrow balance is exhausted for this contract (Rs. ${unbilled} logged against Rs. ${lockedBalance} locked). Ask the client to top up before logging more time.`
    );
  }
};

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

  await assertEscrowHasRoom(contract);

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

  // Try to pay for this chunk of work immediately, straight out of the
  // contract's locked escrow. If the lock can't cover it, the log simply
  // stays 'pending' — it isn't lost, it just waits for the client to top up
  // (see the weekly cron / re-lock endpoint, which retry unbilled logs).
  let needsTopUp = false;
  const job = await Job.findById(contract.jobId);
  try {
    await drawDownForTimeLog({ timeLog: log, contract, job });
  } catch (err) {
    if (!err.errors?.insufficientBalance) {
      console.error(`[stopTimer] Unexpected error drawing down time log ${log._id}:`, err.message);
    }
    needsTopUp = true;
  }

  sendSuccess(res, {
    message: needsTopUp
      ? 'Timer stopped and time logged — escrow is low, ask the client to top up so this gets paid.'
      : 'Timer stopped, time logged, and paid out from escrow.',
    data: { timer: contract.timer, log, needsTopUp }
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

  await assertEscrowHasRoom(contract);

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

  let needsTopUp = false;
  const job = await Job.findById(contract.jobId);
  try {
    await drawDownForTimeLog({ timeLog: log, contract, job });
  } catch (err) {
    if (!err.errors?.insufficientBalance) {
      console.error(`[addManualLog] Unexpected error drawing down time log ${log._id}:`, err.message);
    }
    needsTopUp = true;
  }

  sendSuccess(res, {
    message: needsTopUp
      ? 'Manual time logged — escrow is low, ask the client to top up so this gets paid.'
      : 'Manual time logged and paid out from escrow.',
    data: { log, needsTopUp },
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
