const Contract = require('../models/Contract');
const Delivery = require('../models/Delivery');
const Job = require('../models/Job');
const Milestone = require('../models/Milestone');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/apiError');
const notifications = require('../services/notification.service');
const { finalizeJobCompletion } = require('../services/jobCompletion.service');
const { approveMilestone, getEscrowReleaseDays } = require('../services/milestone.service');
const { drawDownForTimeLog, refundRemainingHourlyEscrow, getUnbilledAmount } = require('../services/hourlyEscrow.service');
const TimeLog = require('../models/TimeLog');


// The milestone the freelancer/client are currently working through on a
// fixed-price contract. Milestones are sequential — there's always exactly
// one "current" one, tracked by Contract.currentMilestoneOrder.
const getCurrentMilestone = (contractId, order) => Milestone.findOne({ contractId, order });

/**
 * Submit a delivery
 */
const submitDelivery = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { message, attachments, externalLinks } = req.body;

  if (!message) {
    throw new BadRequestError('Delivery message is required');
  }

  const contract = await Contract.findById(contractId);
  if (!contract) throw new NotFoundError('Contract not found');

  if (String(contract.freelancerId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the assigned freelancer can submit a delivery');
  }

  // Deliveries now supported for both fixed and hourly

  const allowedStatuses = ['active', 'in_revision'];
  if (!allowedStatuses.includes(contract.status)) {
    throw new BadRequestError(`Cannot submit delivery when contract is ${contract.status}`);
  }

  // Fixed-price contracts require the current milestone's escrow to be fully
  // funded before the freelancer may submit work against it — this is what
  // makes "Escrow Funded 100% - Safe to Work" a real guarantee, not just copy.
  let milestone = null;
  if (contract.type === 'fixed') {
    milestone = await getCurrentMilestone(contract._id, contract.currentMilestoneOrder);
    if (!milestone) throw new NotFoundError('No milestone found for this contract');
    if (!['funded', 'in_revision'].includes(milestone.status)) {
      throw new BadRequestError(`Cannot submit delivery — this milestone is not funded yet (status: ${milestone.status})`);
    }
  }

  // Find latest delivery version
  const lastDelivery = await Delivery.findOne({ contractId }).sort({ version: -1 });
  const version = lastDelivery ? lastDelivery.version + 1 : 1;

  const delivery = await Delivery.create({
    contractId: contract._id,
    milestoneId: milestone?._id,
    jobId: contract.jobId,
    freelancerId: contract.freelancerId,
    clientId: contract.clientId,
    version,
    message,
    files: attachments || [],
    links: externalLinks || [],
    status: 'pending_review'
  });

  contract.status = 'delivered'; // wait, the model has 'delivered'
  contract.revisionNote = '';
  await contract.save();

  if (milestone) {
    const releaseDays = await getEscrowReleaseDays();
    milestone.status = 'submitted';
    milestone.submittedAt = new Date();
    milestone.reviewDeadline = new Date(Date.now() + releaseDays * 24 * 60 * 60 * 1000);
    await milestone.save();
  }

  // onWorkDelivered reads job.title/job._id, not raw IDs — fetch the job so
  // the notification actually names the project instead of rendering blank.
  const deliveredJob = await Job.findById(contract.jobId).select('title').lean();
  notifications.onWorkDelivered(contract.clientId, { job: deliveredJob });

  sendSuccess(res, {
    message: 'Delivery submitted successfully',
    data: { delivery },
    statusCode: 201
  });
});

/**
 * Review a delivery (Accept or Revision Request)
 */
const reviewDelivery = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const { action, feedback } = req.body; // action: 'accept', 'request_revision'

  if (!['accept', 'request_revision'].includes(action)) {
    throw new BadRequestError('Invalid review action');
  }

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) throw new NotFoundError('Delivery not found');

  if (String(delivery.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the client can review this delivery');
  }

  if (delivery.status !== 'pending_review') {
    throw new BadRequestError(`This delivery has already been reviewed (${delivery.status})`);
  }

  const contract = await Contract.findById(delivery.contractId);
  if (!contract) throw new NotFoundError('Contract not found');

  // Resolve via THIS delivery's own milestoneId, not
  // contract.currentMilestoneOrder — the two can drift apart if the
  // auto-release cron already released an earlier milestone (which advances
  // currentMilestoneOrder) while this delivery's review was left pending; a
  // stale action on this delivery must still resolve to the milestone it was
  // actually submitted against, never a later, different one.
  const milestone = contract.type === 'fixed' && delivery.milestoneId
    ? await Milestone.findById(delivery.milestoneId)
    : null;

  if (action === 'request_revision') {
    if (!feedback) {
      throw new BadRequestError('Revision feedback is required');
    }

    delivery.status = 'revision_requested';
    delivery.clientFeedback = feedback;
    delivery.reviewedAt = new Date();
    await delivery.save();

    contract.status = 'in_revision';
    contract.revisionNote = feedback;
    await contract.save();

    if (milestone) {
      milestone.status = 'in_revision';
      milestone.revisionNote = feedback;
      milestone.reviewDeadline = undefined; // no longer awaiting review — cleared until resubmission
      await milestone.save();
    }

    const revisedJob = await Job.findById(contract.jobId).select('title').lean();
    notifications.onRevisionRequested(contract.freelancerId, { job: revisedJob, note: feedback });

    return sendSuccess(res, {
      message: 'Revision requested',
      data: { delivery }
    });
  }

  // Accept action
  delivery.status = 'accepted';
  delivery.reviewedAt = new Date();
  await delivery.save();

  const job = await Job.findById(contract.jobId);

  if (contract.type === 'fixed') {
    if (!milestone) throw new NotFoundError('No milestone found for this contract');

    const { isLastMilestone } = await approveMilestone({ milestone, contract, job });

    return sendSuccess(res, {
      message: isLastMilestone
        ? 'Delivery accepted, contract completed, and payment released!'
        : `Milestone ${milestone.order} accepted and released — funding the next milestone will let the freelancer continue.`,
      data: { delivery, milestone, isLastMilestone }
    });
  }

  // Hourly contracts have no milestones and no single "job_escrow" Payment
  // (that type belongs exclusively to the legacy gig/job 50/50 flow) — an
  // hourly contract's money lives in contract.hourlyEscrow.lockedBalance,
  // built up via per-logged-hour `hourly_invoice` Payments. Completing one
  // here must settle any still-pending time logs against that lock and
  // refund whatever's left to the client, exactly like the mutual
  // end-contract flow (contract.controller.js's respondEndContract) already
  // does — otherwise the remaining lock is stranded: unreachable by any
  // further time-tracking (blocked once status is 'completed') and never
  // refunded (that only happens via the end-request flow this bypasses).
  //
  // Guard BEFORE any write, same as respondEndContract: if the lock can't
  // cover every still-pending logged hour, completing now strands that
  // shortfall permanently (no dispute on a completed contract, no cron
  // sweep of a completed contract) — block and ask the client to top up.
  const unbilled = await getUnbilledAmount(contract);
  const locked = contract.hourlyEscrow?.lockedBalance || 0;
  if (unbilled > locked) {
    throw new BadRequestError(
      `The client's locked escrow (Rs. ${locked}) doesn't cover all logged, unbilled hours (Rs. ${unbilled}). The client must top up the escrow before this delivery can be accepted.`,
      { insufficientBalance: true, required: unbilled, available: locked }
    );
  }

  contract.status = 'completed';
  contract.completedAt = new Date();

  const pendingLogs = await TimeLog.find({ contractId: contract._id, status: 'pending' }).sort({ startTime: 1 });
  let totalDrawn = 0; // gross amount drawn from escrow — what the client actually spent
  for (const log of pendingLogs) {
    try {
      const { amount } = await drawDownForTimeLog({ timeLog: log, contract, job });
      totalDrawn += amount;
    } catch (err) {
      const reason = err.errors?.insufficientBalance ? 'escrow exhausted' : `unexpected error: ${err.message}`;
      console.error(`[reviewDelivery] Could not settle time log ${log._id} (${reason})`);
      break;
    }
  }
  await refundRemainingHourlyEscrow({ contract, job });

  await contract.save();

  if (job && job.status !== 'completed') {
    job.status = 'completed';
    job.completedAt = new Date();
    // skipEarningsCredit: true — drawDownForTimeLog already credited the
    // freelancer's wallet/totalEarnings per settled log above; without this
    // flag finalizeJobCompletion would credit the same payout a second time.
    await finalizeJobCompletion(job, { clientSpend: totalDrawn, skipEarningsCredit: true });
  }

  notifications.onProjectCompleted(contract.freelancerId, { job: { _id: contract.jobId } });

  sendSuccess(res, {
    message: 'Delivery accepted, contract completed, and payment released!',
    data: { delivery }
  });
});

/**
 * Get all deliveries for a contract
 */
const getContractDeliveries = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { limit, skip } = parsePagination(req.query);

  const contract = await Contract.findById(contractId);
  if (!contract) throw new NotFoundError('Contract not found');

  if (
    String(contract.clientId) !== String(req.user._id) &&
    String(contract.freelancerId) !== String(req.user._id)
  ) {
    throw new ForbiddenError('You do not have access to these deliveries');
  }

  const deliveries = await Delivery.find({ contractId })
    .sort({ version: -1 })
    .skip(skip)
    .limit(limit);

  sendSuccess(res, { data: { deliveries } });
});

module.exports = {
  submitDelivery,
  reviewDelivery,
  getContractDeliveries
};
