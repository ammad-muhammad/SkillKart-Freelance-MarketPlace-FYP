const Job = require('../models/Job');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/apiError');
const { uploadJobAttachment: uploadJobAttachmentToCloud } = require('../services/upload.service');
const { recommendJobCategory, recommendJobSubcategory } = require('../services/jobCategory.service');
const { recalculateRating } = require('../services/rating.service');
const Payment = require('../models/Payment');
const Proposal = require('../models/Proposal');
const ClientProfile = require('../models/ClientProfile');
const { buildGraphSearchQuery } = require('../services/search.service');
const Review = require('../models/Review');
const notifications = require('../services/notification.service');
const { stripHtml } = require('../utils/sanitizeInput');


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
const CREATABLE_JOB_FIELDS = ['title', 'description', 'budget', 'skills', 'category', 'subcategory', 'experienceLevel', 'duration', 'deadline', 'attachments'];

const createJob = asyncHandler(async (req, res) => {
  const jobData = req.body;
  const clientId = req.user._id;

  const allowedStatuses = ['draft', 'open'];
  const status = allowedStatuses.includes(jobData.status) ? jobData.status : 'open';

  // No proof-of-funds gate at posting time — a client can publish a project
  // with any wallet balance so it's visible to freelancers and can collect
  // proposals. The wallet is only checked (and locked) when they actually
  // accept a proposal — see proposal.controller.js's acceptProposal.

  // Only content fields are ever taken from the body — lifecycle/identity
  // fields (hiredFreelancer, contractId, completedAt, statsRolledUp, source,
  // gigId, ...) are never client-settable at creation, same rule as updateJob.
  const fields = {};
  for (const key of CREATABLE_JOB_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(jobData, key)) {
      fields[key] = jobData[key];
    }
  }
  if (fields.description !== undefined) fields.description = stripHtml(fields.description);

  const job = new Job({
    ...fields,
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

  // Allow transitioning from draft to open — no proof-of-funds gate here
  // either (see createJob); the wallet is only checked at proposal-accept time.
  if (job.status === 'draft' && req.body.status === 'open') {
    job.status = 'open';
  }

  // Apply only whitelisted content fields. `budget` is merged (not replaced)
  // so a partial update — e.g. only { budget: { max } } — can't silently
  // wipe out the other side of the range.
  for (const key of EDITABLE_JOB_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      if (key === 'budget' && req.body.budget && typeof req.body.budget === 'object') {
        const existing = job.budget?.toObject ? job.budget.toObject() : (job.budget || {});
        job.budget = { ...existing, ...req.body.budget };
      } else {
        job[key] = key === 'description' ? stripHtml(req.body[key]) : req.body[key];
      }
    }
  }

  // The validator only cross-checks min/max within the same request body —
  // re-check against the merged (persisted + incoming) result so a
  // max-only or min-only patch can't leave an inverted range.
  if (job.budget && job.budget.min != null && job.budget.max != null && job.budget.max < job.budget.min) {
    throw new BadRequestError('Maximum budget must be greater than minimum budget');
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

  // This route is public (optionalAuth) — never populate proposals' bids/
  // cover-letters/applicant identities here, and never leak email addresses.
  // The UI only ever needs a count and "have I already applied", both
  // computed below without exposing any other freelancer's proposal data.
  const job = await Job.findById(id)
    .populate('clientId', 'firstName lastName profilePicture')
    .populate('hiredFreelancer', 'firstName lastName profilePicture');

  if (!job) {
    throw new NotFoundError('Job not found');
  }
  // Draft jobs are never published — only the owning client (or an admin)
  // may view one, otherwise anyone who obtains/guesses the ObjectId could
  // read a client's private, unpublished draft content. Every other status
  // (open, in-progress, completed, ...) was public at some point, so those
  // stay visible to anyone, matching normal marketplace listing behavior.
  if (job.status === 'draft') {
    const isOwner = req.user && String(job.clientId?._id) === String(req.user._id);
    const isAdmin = req.user && ['admin', 'superadmin'].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      throw new NotFoundError('Job not found');
    }
  }

  const proposalsCount = Array.isArray(job.proposals) ? job.proposals.length : 0;
  // Own proposal only (never another freelancer's) — enough for the UI to
  // show "Apply Now" / "Edit Proposal" / "Edit & Resubmit" / "Applied" and to
  // prefill the edit form without a second round-trip.
  let myProposal = null;
  if (req.user?.role === 'freelancer') {
    myProposal = await Proposal.findOne({ jobId: job._id, freelancerId: req.user._id })
      .select('status canResubmit coverLetter fixedPrice hourlyRate estimatedDeliveryTime estimatedWeeklyHours attachments clientResponse')
      .lean();
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
  delete jobObj.proposals; // never expose the raw proposal id list either
  jobObj.proposalsCount = proposalsCount;
  jobObj.hasApplied = !!myProposal;
  jobObj.myProposal = myProposal;
  jobObj.clientStats = clientStats;

  sendSuccess(res, {
    message: 'Job retrieved successfully',
    data: { job: jobObj }
  });
});

/**
 * List jobs
 */
// Whitelisted sort fields for listJobs — never build a Mongo sort object
// directly from user input.
const JOB_SORT_FIELDS = {
  createdAt: 'createdAt',
  budget: 'budget.min',
  deadline: 'deadline',
  title: 'title'
};

const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { category, skills, experienceLevel, budgetType, clientId, minBudget, maxBudget, sortBy, sortOrder } = req.query;

  await syncJobStatuses(clientId ? { clientId } : {});

  const query = { status: 'open' }; // Strictly only open jobs for public
  if (clientId) query.clientId = clientId;
  if (experienceLevel) query.experienceLevel = experienceLevel;
  if (budgetType) query['budget.type'] = budgetType;

  if (minBudget || maxBudget) {
    query['budget.min'] = {};
    if (minBudget) query['budget.min'].$gte = parseFloat(minBudget);
    if (maxBudget) query['budget.min'].$lte = parseFloat(maxBudget);
  }

  // Graph-aware category filter: expand to related categories
  if (category) {
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

  const sortField = JOB_SORT_FIELDS[sortBy] || 'createdAt';
  const sortDir = sortOrder === 'asc' ? 1 : -1;

  const total = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .populate('clientId', 'firstName lastName profilePicture')
    .skip(skip)
    .limit(limit)
    .sort({ [sortField]: sortDir });

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
  if (['project', 'gig'].includes(req.query.source)) query.source = req.query.source;
  const total = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .populate('clientId', 'firstName lastName profilePicture')
    .skip(skip)
    .limit(limit)
    .sort({ updatedAt: -1 })
    .lean();

  // Attach each job's escrow record
  const payments = await Payment.find({ jobId: { $in: jobs.map((j) => j._id) } })
    .select('jobId status depositAmount finalAmount totalAmount platformFee freelancerPayout')
    .lean();
  const payByJob = new Map(payments.map((p) => [String(p.jobId), p]));

  // Check which jobs this freelancer has already reviewed
  const Review = require('../models/Review');
  const reviews = await Review.find({ reviewerId: freelancerId, jobId: { $in: jobs.map((j) => j._id) } }).lean();
  const reviewedJobIds = new Set(reviews.map((r) => String(r.jobId)));

  const items = jobs.map((j) => ({ 
    ...j, 
    payment: payByJob.get(String(j._id)) || null,
    hasReviewed: reviewedJobIds.has(String(j._id))
  }));

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
    .populate('hiredFreelancer', 'firstName lastName profilePicture _id')
    .populate('contractId', 'status type timer hourlyRate weeklyLimit hourlyEscrow endRequest dispute milestoneMode currentMilestoneOrder')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  const contractIds = jobs.map((j) => j.contractId?._id).filter(Boolean);

  // Fixed-price contracts have one Payment PER MILESTONE, not one per job —
  // fetch milestones + their own escrow Payment together (mirrors the fix in
  // contract.controller.js's getMyContracts) so `payment` reflects the
  // CURRENT milestone instead of an arbitrary one when there's more than one.
  const Milestone = require('../models/Milestone');
  const [payments, milestonesRaw] = await Promise.all([
    Payment.find({ jobId: { $in: jobs.map((j) => j._id) } })
      .select('jobId milestoneId status depositAmount finalAmount totalAmount')
      .lean(),
    Milestone.find({ contractId: { $in: contractIds } }).sort({ order: 1 }).lean()
  ]);

  const paymentByMilestone = new Map(payments.filter((p) => p.milestoneId).map((p) => [String(p.milestoneId), p]));
  const legacyPayByJob = new Map(payments.filter((p) => !p.milestoneId).map((p) => [String(p.jobId), p]));

  const milestonesByContract = new Map();
  for (const m of milestonesRaw) {
    const key = String(m.contractId);
    if (!milestonesByContract.has(key)) milestonesByContract.set(key, []);
    milestonesByContract.get(key).push({ ...m, payment: paymentByMilestone.get(String(m._id)) || null });
  }

  const Review = require('../models/Review');
  const reviews = await Review.find({ reviewerId: clientId, jobId: { $in: jobs.map((j) => j._id) } }).lean();
  const reviewedJobIds = new Set(reviews.map((r) => String(r.jobId)));

  const TimeLog = require('../models/TimeLog');
  const recentLogs = await TimeLog.aggregate([
    { $match: { jobId: { $in: jobs.map((j) => j._id) } } },
    { $sort: { endTime: -1 } },
    { $group: { _id: "$jobId", lastLog: { $first: "$$ROOT" }, totalDuration: { $sum: "$duration" } } }
  ]);
  const logsByJob = new Map(recentLogs.map((log) => [String(log._id), log]));

  const items = jobs.map((j) => {
    const jobLogs = logsByJob.get(String(j._id)) || {};
    const milestones = milestonesByContract.get(String(j.contractId?._id)) || [];
    const currentMilestone = milestones.find((m) => m.order === j.contractId?.currentMilestoneOrder) || null;
    return {
      ...j,
      milestones,
      currentMilestone,
      payment: currentMilestone?.payment || legacyPayByJob.get(String(j._id)) || null,
      hasReviewed: reviewedJobIds.has(String(j._id)),
      contractType: j.contractId?.type || 'fixed',
      hourlyRate: j.contractId?.hourlyRate || 0,
      weeklyLimit: j.contractId?.weeklyLimit || 0,
      hourlyEscrow: j.contractId?.hourlyEscrow || null,
      timerActive: j.contractId?.timer?.isActive || false,
      timerStartedAt: j.contractId?.timer?.startedAt || null,
      endRequest: j.contractId?.endRequest || null,
      // Fixed-price disputes live on the milestone, not the contract (see
      // contract.controller.js's raiseDispute) — hourly still uses contract.dispute.
      dispute: (j.contractId?.type === 'fixed' ? currentMilestone?.dispute : j.contractId?.dispute) || null,
      lastTimeLog: jobLogs.lastLog || null,
      totalDuration: jobLogs.totalDuration || 0
    };
  });

  console.log(`Sending my projects. Found ${reviewedJobIds.size} reviews. First item hasReviewed:`, items[0]?.hasReviewed);

  sendPaginated(res, { data: items, page, limit, total });
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

// Removed deprecated submitDelivery, acceptDelivery, requestRevision functions.

/**
 * Submit delivery for a GIG order (source: 'gig'). Gig orders stay on the
 * legacy 50/50 Stripe deposit flow and never get a Contract/Milestone, so
 * delivery lives directly on the Job — see paymentController.startFinal for
 * the other half (client reviews this, then releases the final 50%).
 */
const submitGigDelivery = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message, links } = req.body;

  if (!message || !message.trim()) {
    throw new BadRequestError('A delivery message is required');
  }

  const job = await Job.findById(id);
  if (!job) throw new NotFoundError('Job not found');
  if (job.source !== 'gig') throw new BadRequestError('This job is not a gig order');
  if (String(job.hiredFreelancer) !== String(req.user._id)) {
    throw new ForbiddenError('Only the hired freelancer can submit delivery for this order');
  }
  if (!['in-progress'].includes(job.status)) {
    throw new BadRequestError(`Cannot submit delivery while the order is "${job.status}"`);
  }

  const payment = await Payment.findOne({ jobId: job._id, type: 'job_escrow' });
  if (!payment || payment.status !== 'deposit_paid') {
    throw new BadRequestError('The client has not funded the deposit for this order yet');
  }

  job.delivery = {
    message: stripHtml(message.trim()),
    links: Array.isArray(links) ? links.filter(Boolean).slice(0, 10) : [],
    submittedAt: new Date(),
  };
  await job.save();

  notifications.onWorkDelivered(job.clientId, { job });

  sendSuccess(res, { message: 'Delivery submitted. The client will review it.', data: { job } });
});

/**
 * Client requests changes on a GIG order's delivery — sends it back to the
 * freelancer instead of releasing final payment.
 */
const requestGigRevision = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  if (!note || !note.trim()) {
    throw new BadRequestError('A revision note is required');
  }

  const job = await Job.findById(id);
  if (!job) throw new NotFoundError('Job not found');
  if (job.source !== 'gig') throw new BadRequestError('This job is not a gig order');
  if (String(job.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the client who ordered this gig can request a revision');
  }
  if (!job.delivery) throw new BadRequestError('There is no delivery to request changes on yet');

  job.delivery = undefined;
  await job.save();

  if (job.hiredFreelancer) {
    notifications.onRevisionRequested(job.hiredFreelancer, { job });
  }

  sendSuccess(res, { message: 'Revision requested. The freelancer will make changes.', data: { job } });
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

  await recalculateRating({ revieweeId, type, jobId: id });

  const reviewerName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Someone';
  notifications.onReviewSubmitted(revieweeId, { reviewerName, job });

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

const recommendSubcategory = asyncHandler(async (req, res) => {
  const { title, description, skills, category } = req.body;
  const result = await recommendJobSubcategory(title, description, skills, category);

  sendSuccess(res, {
    message: 'Subcategory recommendation generated',
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

// Obsolete cancelJob function removed. Cancellation is now managed by Contract API.



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
  recommendSubcategory,
  getMyProjects,
  getMyContracts,
  submitGigDelivery,
  requestGigRevision,
  reviewJob
};
