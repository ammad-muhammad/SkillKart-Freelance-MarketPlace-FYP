const Job = require('../models/Job');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/apiError');
const { uploadJobAttachment: uploadJobAttachmentToCloud } = require('../services/upload.service');
const { recommendJobCategory } = require('../services/jobCategory.service');
const { finalizeJobCompletion } = require('../services/jobCompletion.service');
const Payment = require('../models/Payment');
const Proposal = require('../models/Proposal');
const ClientProfile = require('../models/ClientProfile');
const { buildGraphSearchQuery } = require('../services/search.service');
const FreelancerProfile = require('../models/FreelancerProfile');
const Review = require('../models/Review');
const notifications = require('../services/notification.service');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Sync job statuses based on deadlines
 */
const syncJobStatuses = async (query = {}) => {
  const now = new Date();
  // Find open jobs where deadline has passed
  await Job.updateMany(
    { 
      ...query,
      status: 'open', 
      deadline: { $lt: now } 
    },
    { $set: { status: 'expired' } }
  );
};

/**
 * Create job
 */
const createJob = asyncHandler(async (req, res) => {
  const jobData = req.body;
  const clientId = req.user._id;
  
  const allowedStatuses = ['draft', 'open'];
  const status = allowedStatuses.includes(jobData.status) ? jobData.status : 'open';

  const job = new Job({
    ...jobData,
    clientId,
    status
  });

  await job.save();

  // Trigger background suggestion flow for unrecognized skills
  const taxonomy = require('../services/taxonomy.service');
  taxonomy.proposeUnrecognizedSkills(jobData.skills, jobData.category, 'job_posting', job._id);
  taxonomy.invalidateCache();

  sendCreated(res, 'Job created successfully', { job });
});

/**
 * Update job.
 * - Ownership enforced (a client may only edit their OWN job).
 * - Only CONTENT fields are editable, and only while the job is still
 *   draft/open. Status and lifecycle/identity fields (status, hiredFreelancer,
 *   clientId, proposals, delivery, completedAt, revisionCount, …) are NEVER
 *   taken from the body — status is driven solely by the gated lifecycle
 *   endpoints (accept proposal, deliver, accept-delivery, payment confirm).
 */
const EDITABLE_JOB_FIELDS = ['title', 'description', 'budget', 'skills', 'category', 'subcategory', 'experienceLevel', 'duration', 'deadline', 'attachments'];

const updateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id);
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  if (String(job.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('You can only edit your own projects');
  }
  if (!['draft', 'open'].includes(job.status)) {
    throw new BadRequestError(`A project that is "${job.status}" can no longer be edited.`);
  }

  // Allow transitioning from draft to open
  if (job.status === 'draft' && req.body.status === 'open') {
    job.status = 'open';
  }

  // Apply only whitelisted content fields.
  for (const key of EDITABLE_JOB_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      job[key] = req.body[key];
    }
  }
  await job.save();

  // Trigger background suggestion flow for unrecognized skills
  const taxonomy = require('../services/taxonomy.service');
  taxonomy.proposeUnrecognizedSkills(job.skills, job.category, 'job_posting', job._id);
  taxonomy.invalidateCache();

  sendSuccess(res, {
    message: 'Job updated successfully',
    data: { job }
  });
});

/**
 * Get job by ID
 */
const getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await syncJobStatuses({ _id: id });

  const job = await Job.findById(id)
    .populate('clientId', 'firstName lastName email profilePicture')
    .populate('hiredFreelancer', 'firstName lastName email profilePicture')
    .populate({
      path: 'proposals',
      populate: { path: 'freelancerId', select: 'firstName lastName profilePicture' }
    });

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  // Enrich with the poster's real client stats (rating, verification, and a live
  // count of jobs they've posted) so the "About the Client" card is dynamic.
  let clientStats = null;
  if (job.clientId?._id) {
    const [profile, jobsPosted] = await Promise.all([
      ClientProfile.findOne({ userId: job.clientId._id }).select('rating verificationStatus totalProjectsPosted').lean(),
      Job.countDocuments({ clientId: job.clientId._id }),
    ]);
    clientStats = {
      rating: Number(profile?.rating) || 0,
      verified: profile?.verificationStatus === 'verified',
      jobsPosted: jobsPosted,
    };
  }

  const jobObj = job.toObject();
  jobObj.clientStats = clientStats;

  sendSuccess(res, {
    message: 'Job retrieved successfully',
    data: { job: jobObj }
  });
});

/**
 * List jobs
 */
const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, category, skills, experienceLevel, budgetType, clientId } = req.query;
  
  await syncJobStatuses(clientId ? { clientId } : {});
  
  const query = { status: 'open' }; // Strictly only open jobs for public
  if (experienceLevel) query.experienceLevel = experienceLevel;
  if (budgetType) query['budget.type'] = budgetType;

  // Graph-aware category filter: expand to related categories
  if (category) {
    const { buildGraphSearchQuery: bgs } = require('../services/search.service');
    const catExpanded = await require('../services/taxonomy.service').expandSearchTerms(category);
    query.category = catExpanded.length ? { $in: catExpanded } : category;
  }

  // Graph-aware skills filter: expand to related skills
  if (skills) {
    const skillsArray = skills.split(',').map(s => s.trim());
    const taxonomy = require('../services/taxonomy.service');
    const expandedAll = (await Promise.all(skillsArray.map(s => taxonomy.expandSearchTerms(s)))).flat();
    const uniqueExpanded = [...new Set(expandedAll)];
    query.skills = { $in: uniqueExpanded.length ? uniqueExpanded : skillsArray };
  }
  
  const total = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .populate('clientId', 'firstName lastName profilePicture')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  
  sendPaginated(res, { data: jobs, page, limit, total });
});

/**
 * List the freelancer's CONTRACTS — jobs they were hired for (proposal or gig
 * order). Includes the escrow/payment status + their net payout so the
 * freelancer can see active work and earnings in one place.
 */
const getMyContracts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const freelancerId = req.user._id;

  const query = { hiredFreelancer: freelancerId };
  const total = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .populate('clientId', 'firstName lastName profilePicture')
    .skip(skip)
    .limit(limit)
    .sort({ updatedAt: -1 })
    .lean();

  // Attach each job's escrow record (deposit funded? released? payout?).
  const payments = await Payment.find({ jobId: { $in: jobs.map((j) => j._id) } })
    .select('jobId status depositAmount finalAmount totalAmount platformFee freelancerPayout')
    .lean();
  const payByJob = new Map(payments.map((p) => [String(p.jobId), p]));

  const items = jobs.map((j) => ({ ...j, payment: payByJob.get(String(j._id)) || null }));

  sendPaginated(res, { data: items, page, limit, total });
});

/**
 * List client's own projects
 */
const getMyProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const clientId = req.user._id;

  await syncJobStatuses({ clientId });

  const query = { clientId };
  const total = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  sendPaginated(res, { data: jobs, page, limit, total });
});

/**
 * Search jobs
 */
const searchJobs = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  
  if (!q || !String(q).trim()) {
    return sendPaginated(res, { data: [], page, limit, total: 0 });
  }

  // Graph-expanded search: "Web Developer" finds React, Node.js, Vue jobs automatically
  const graphClause = await buildGraphSearchQuery(q, ['skills', 'category']);

  const query = {
    status: 'open',
    ...graphClause,
  };
  
  const total = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .populate('clientId', 'firstName lastName profilePicture')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  
  sendPaginated(res, { data: jobs, page, limit, total });
});

/**
 * Delete job
 */
const deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id);
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  // Ownership (admins/superadmins may delete any — the route allows those roles).
  const isPrivileged = ['admin', 'superadmin'].includes(req.user.role);
  if (!isPrivileged && String(job.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('You can only delete your own projects');
  }

  // Don't allow deleting a job that is mid-contract or has money in escrow —
  // that would strand a hired freelancer and any deposit. Also protect completed jobs.
  if (['in-progress', 'delivered', 'completed'].includes(job.status)) {
    throw new BadRequestError('You cannot delete a project that is in progress, delivered, or completed.');
  }
  const activePayment = await Payment.findOne({ jobId: id, status: { $in: ['deposit_paid'] } }).select('_id');
  if (activePayment) {
    throw new BadRequestError('This project has funds in escrow and cannot be deleted.');
  }

  // Cascade: remove this job's proposals so none are left orphaned.
  await Proposal.deleteMany({ jobId: id });
  await Job.deleteOne({ _id: id });

  sendSuccess(res, {
    message: 'Job deleted successfully'
  });
});

/**
 * Close job
 */
const closeJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id);
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  if (String(job.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('You can only close your own projects');
  }

  // Closing is only for ending an OPEN job that won't be hired. A job that is
  // already hired/in-progress/delivered must go through the delivery+payment
  // lifecycle (so escrow isn't bypassed), not a manual close-to-completed.
  if (job.status !== 'open' && job.status !== 'draft') {
    throw new BadRequestError(`A "${job.status}" project can’t be closed here. Use the delivery/payment flow to complete it.`);
  }

  job.status = 'closed';
  await job.save();

  // Reject pending proposals
  await Proposal.updateMany(
    { jobId: id, status: 'pending' },
    { $set: { status: 'rejected', clientResponse: 'Job closed', respondedAt: new Date() } }
  );

  sendSuccess(res, {
    message: 'Job closed successfully',
    data: { job }
  });
});

/**
 * Submit delivery (freelancer). in-progress → delivered.
 * Only the hired freelancer may deliver, and only while in-progress.
 */
const submitDelivery = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message, links = [], files = [] } = req.body;

  const job = await Job.findById(id);
  if (!job) throw new NotFoundError('Job not found');

  if (!job.hiredFreelancer || String(job.hiredFreelancer) !== String(req.user._id)) {
    throw new ForbiddenError('Only the hired freelancer can deliver this project');
  }
  if (job.status !== 'in-progress') {
    throw new BadRequestError(`Cannot deliver a project that is "${job.status}". It must be in progress.`);
  }

  // Escrow gate: the client must have paid the 50% deposit before work can be
  // delivered (so the freelancer is protected before handing over results).
  const payment = await Payment.findOne({ jobId: job._id }).select('status');
  if (!payment || payment.status === 'deposit_pending') {
    throw new BadRequestError('The client hasn’t paid the 50% deposit yet. You can deliver once the deposit is funded.');
  }

  job.delivery = {
    message: message || '',
    links: Array.isArray(links) ? links.filter(Boolean) : [],
    files: Array.isArray(files) ? files.filter(Boolean) : [],
    submittedAt: new Date(),
  };
  job.status = 'delivered';
  await job.save();

  // Notify the client that work is ready to review.
  notifications.onWorkDelivered(job.clientId, { job });

  sendSuccess(res, { message: 'Work delivered. Waiting for client approval.', data: { job } });
});

/**
 * Accept delivery (client). delivered → completed.
 * Triggers stats roll-up. Only the owning client may accept.
 */
const acceptDelivery = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id);
  if (!job) throw new NotFoundError('Job not found');

  if (String(job.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the project owner can accept the delivery');
  }
  if (job.status !== 'delivered') {
    throw new BadRequestError(`Cannot accept a project that is "${job.status}". It must be delivered first.`);
  }

  // Escrow gate: accepting delivery requires the final 50% to be paid. The
  // payment confirm step is what releases funds and completes the job, so if
  // it isn't released yet, send the client to pay the remaining balance.
  const payment = await Payment.findOne({ jobId: job._id }).select('status finalAmount freelancerPayout totalAmount');
  if (!payment || payment.status !== 'released') {
    return sendSuccess(res, {
      message: 'Pay the remaining 50% to release funds and complete the project.',
      data: { paymentRequired: true, phase: 'final', finalAmount: payment?.finalAmount || 0, job },
    });
  }

  // Already paid/released (e.g. confirm ran) — ensure the job is completed.
  if (job.status !== 'completed') {
    job.status = 'completed';
    job.completedAt = new Date();
    await job.save();
    try {
      await finalizeJobCompletion(job, { freelancerEarning: payment.freelancerPayout, clientSpend: payment.totalAmount });
    } catch (e) {
      console.error('[acceptDelivery] stats roll-up failed:', e.message);
    }
  }

  sendSuccess(res, { message: 'Delivery accepted. Project completed! 🎉', data: { job } });
});

/**
 * Request revision (client). delivered → in-progress.
 * Records the revision note + increments the counter.
 */
const requestRevision = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const job = await Job.findById(id);
  if (!job) throw new NotFoundError('Job not found');

  if (String(job.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the project owner can request a revision');
  }
  if (job.status !== 'delivered') {
    throw new BadRequestError(`Cannot request a revision on a project that is "${job.status}". It must be delivered first.`);
  }

  job.status = 'in-progress';
  job.revisionCount = (job.revisionCount || 0) + 1;
  job.revisionNote = note || '';
  await job.save();

  // Notify the freelancer that changes were requested.
  if (job.hiredFreelancer) notifications.onRevisionRequested(job.hiredFreelancer, { job });

  sendSuccess(res, { message: 'Revision requested. The freelancer has been asked to make changes.', data: { job } });
});

/**
 * Review a completed job.
 */
const reviewJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const reviewerId = req.user._id;

  const job = await Job.findById(id);
  if (!job) throw new NotFoundError('Job not found');
  if (job.status !== 'completed') {
    throw new BadRequestError('You can only review completed jobs.');
  }

  const isClient = String(job.clientId) === String(reviewerId);
  const isFreelancer = String(job.hiredFreelancer) === String(reviewerId);

  if (!isClient && !isFreelancer) {
    throw new ForbiddenError('You must be a participant of this project to leave a review.');
  }

  const revieweeId = isClient ? job.hiredFreelancer : job.clientId;
  const type = isClient ? 'client_to_freelancer' : 'freelancer_to_client';

  // Check if review already exists
  const existingReview = await Review.findOne({ jobId: id, reviewerId });
  if (existingReview) {
    throw new BadRequestError('You have already reviewed this project.');
  }

  const review = new Review({
    jobId: id,
    reviewerId,
    revieweeId,
    rating,
    comment,
    type
  });
  await review.save();

  // Recalculate average rating for reviewee
  const allReviews = await Review.find({ revieweeId, type });
  const avgRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;

  if (isClient) {
    await FreelancerProfile.findOneAndUpdate(
      { userId: revieweeId },
      { rating: avgRating }
    );
  } else {
    await ClientProfile.findOneAndUpdate(
      { userId: revieweeId },
      { rating: avgRating }
    );
  }

  sendSuccess(res, { message: 'Review submitted successfully', data: { review } });
});

const recommendCategory = asyncHandler(async (req, res) => {
  const { title, description, skills } = req.body;
  const result = await recommendJobCategory(title, description, skills);

  sendSuccess(res, {
    message: 'Category recommendation generated',
    data: result
  });
});

const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const uploaded = await uploadJobAttachmentToCloud(req.file);

  sendSuccess(res, {
    message: 'Attachment uploaded successfully',
    data: uploaded
  });
});

/**
 * Cancel an in-progress or delivered job.
 * Only the client can cancel. Refunds the 50% deposit if applicable.
 */
const cancelJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id);
  if (!job) throw new NotFoundError('Job not found');

  if (String(job.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the project owner can cancel the project');
  }

  // Prevent clients from cancelling and refunding themselves AFTER work is delivered.
  // Disputes on delivered work must be handled by support in the MVP.
  if (!['in-progress'].includes(job.status)) {
    if (job.status === 'delivered') {
      throw new BadRequestError('Cannot cancel a project after work has been delivered. Please request a revision or contact support to dispute the delivery.');
    }
    throw new BadRequestError(`Cannot cancel a project that is "${job.status}".`);
  }

  job.status = 'cancelled';
  await job.save();

  // Refund the deposit
  const payment = await Payment.findOne({ jobId: id, status: 'deposit_paid' });
  if (payment) {
    payment.status = 'refunded';
    await payment.save();
    
    // Simulate refund by adding funds to client wallet since this is test mode
    await ClientProfile.findOneAndUpdate(
      { userId: job.clientId },
      { $inc: { walletBalance: payment.depositAmount } }
    );
  }

  if (job.hiredFreelancer) {
    notifications.notify(job.hiredFreelancer, {
      type: 'contract_cancelled',
      title: 'Contract Cancelled',
      message: `The client has cancelled the contract for "${job.title}".`,
      link: `/jobs/${job._id}`
    });
  }

  sendSuccess(res, {
    message: 'Project cancelled successfully and deposit refunded',
    data: { job }
  });
});

module.exports = {
  createJob,
  updateJob,
  getJobById,
  listJobs,
  searchJobs,
  deleteJob,
  closeJob,
  uploadAttachment,
  recommendCategory,
  getMyProjects,
  getMyContracts,
  submitDelivery,
  acceptDelivery,
  requestRevision,
  reviewJob,
  cancelJob
};
