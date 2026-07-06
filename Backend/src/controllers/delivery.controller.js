const Contract = require('../models/Contract');
const Delivery = require('../models/Delivery');
const Payment = require('../models/Payment');
const Job = require('../models/Job');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/apiError');
const notifications = require('../services/notification.service');
const { finalizeJobCompletion } = require('../services/jobCompletion.service');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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

  // Find latest delivery version
  const lastDelivery = await Delivery.findOne({ contractId }).sort({ version: -1 });
  const version = lastDelivery ? lastDelivery.version + 1 : 1;

  const delivery = await Delivery.create({
    contractId: contract._id,
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

  contract.status = 'completed';
  contract.completedAt = new Date();
  await contract.save();

  // Release escrow if it exists (e.g. fixed contracts)
  const payment = await Payment.findOne({ contractId: contract._id, type: 'job_escrow' });
  if (payment && payment.status !== 'released') {
    payment.platformFee = round2(payment.totalAmount * payment.feeRate);
    payment.freelancerPayout = round2(payment.totalAmount - payment.platformFee);
    payment.status = 'released';
    payment.releasedAt = new Date();
    await payment.save();
  }

  const job = await Job.findById(contract.jobId);
  if (job && job.status !== 'completed') {
    job.status = 'completed';
    job.completedAt = new Date();
    if (payment) {
      await finalizeJobCompletion(job, payment);
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
