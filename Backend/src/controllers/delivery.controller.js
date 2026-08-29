const Contract = require('../models/Contract');
const Delivery = require('../models/Delivery');
const Payment = require('../models/Payment');
const Job = require('../models/Job');
const Milestone = require('../models/Milestone');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/apiError');
const notifications = require('../services/notification.service');
const { finalizeJobCompletion } = require('../services/jobCompletion.service');
const { approveMilestone, getEscrowReleaseDays } = require('../services/milestone.service');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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

  notifications.onWorkDelivered(contract.clientId, { contractId: contract._id, jobId: contract.jobId });

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

  const milestone = contract.type === 'fixed'
    ? await getCurrentMilestone(contract._id, contract.currentMilestoneOrder)
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

    notifications.onRevisionRequested(contract.freelancerId, { contractId: contract._id, jobId: contract.jobId });

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

  // Hourly contracts have no milestones — unchanged single-Payment release.
  contract.status = 'completed';
  contract.completedAt = new Date();
  await contract.save();

  const payment = await Payment.findOne({ contractId: contract._id, type: 'job_escrow' });
  if (payment && payment.status !== 'released') {
    payment.platformFee = round2(payment.totalAmount * payment.feeRate);
    payment.freelancerPayout = round2(payment.totalAmount - payment.platformFee);
    payment.status = 'released';
    payment.releasedAt = new Date();
    await payment.save();
  }

  if (job && job.status !== 'completed') {
    job.status = 'completed';
    job.completedAt = new Date();
    if (payment) {
      await finalizeJobCompletion(job, { freelancerEarning: payment.freelancerPayout, clientSpend: payment.totalAmount });
    } else {
      await job.save();
    }
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
  const { page, limit, skip } = parsePagination(req.query);

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
