const Proposal = require('../models/Proposal');
const Job = require('../models/Job');
const FreelancerProfile = require('../models/FreelancerProfile');
const { sendSuccess, sendCreated, sendPaginated, sendError } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, ForbiddenError } = require('../utils/apiError');
const { getAIProvider } = require('../services/ai');
const { checkSkillGate } = require('../utils/skillGating');
const notifications = require('../services/notification.service');

/**
 * Create proposal.
 * Skill-gated: the freelancer must have passed (verified) at least one skill
 * matching the job's required skills / category before applying.
 */
const createProposal = asyncHandler(async (req, res) => {
  const proposalData = req.body;
  const freelancerId = req.user._id;

  // Need the job's required skills + category to gate the application.
  const job = await Job.findById(proposalData.jobId).select('skills category clientId title');
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const gate = await checkSkillGate(freelancerId, job.skills, job.category);
  if (!gate.allowed) {
    return sendError(res, {
      statusCode: 403,
      message: 'You need to pass the skill test for this project’s required skills before you can apply. Verify at least one of them to continue.',
      errors: {
        skillTestRequired: true,
        requiredSkills: job.skills || [],
        category: job.category || '',
        verifiedSkills: gate.verifiedSkills,
      },
    });
  }

  const proposal = new Proposal({
    ...proposalData,
    freelancerId,
    status: 'pending'
  });

  await proposal.save();

  // Add proposal to job
  await Job.findByIdAndUpdate(proposalData.jobId, {
    $push: { proposals: proposal._id }
  });

  // Notify the client that a new proposal arrived.
  notifications.onProposalReceived(job.clientId, {
    job,
    freelancerName: [req.user.firstName, req.user.lastName].filter(Boolean).join(' '),
  });

  sendCreated(res, 'Proposal submitted successfully', { proposal });
});

/**
 * Update proposal
 */
const updateProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const proposal = await Proposal.findById(id);
  if (!proposal) {
    throw new NotFoundError('Proposal not found');
  }
  // Ownership: a freelancer may only edit their OWN proposal.
  if (String(proposal.freelancerId) !== String(req.user._id)) {
    throw new ForbiddenError('You can only edit your own proposals');
  }
  // Can't edit once the client has acted on it.
  if (proposal.status !== 'pending') {
    throw new ForbiddenError(`A "${proposal.status}" proposal can no longer be edited.`);
  }

  // Allow-list only — never let status/jobId/freelancerId/clientResponse be set.
  for (const key of ['coverLetter', 'proposedRate', 'estimatedDuration', 'attachments']) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) proposal[key] = req.body[key];
  }
  await proposal.save();

  sendSuccess(res, {
    message: 'Proposal updated successfully',
    data: { proposal }
  });
});

/**
 * Get proposal by ID
 */
const getProposalById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const proposal = await Proposal.findById(id)
    .populate('jobId')
    .populate('freelancerId', 'firstName lastName email profilePicture rating');
  
  if (!proposal) {
    throw new NotFoundError('Proposal not found');
  }
  
  sendSuccess(res, {
    message: 'Proposal retrieved successfully',
    data: { proposal }
  });
});

/**
 * List proposals
 */
const listProposals = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { jobId, status, freelancerId } = req.query;
  
  const query = {};
  if (jobId) query.jobId = jobId;
  if (status) query.status = status;
  if (freelancerId) query.freelancerId = freelancerId;

  // Security: If freelancer, only show their own proposals unless jobId is specified (even then, usually not allowed)
  if (req.user.role === 'freelancer') {
    query.freelancerId = req.user._id;
  }
  
  const total = await Proposal.countDocuments(query);
  const proposals = await Proposal.find(query)
    .populate('jobId', 'title category budget status')
    .populate('freelancerId', 'firstName lastName profilePicture rating')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  
  sendPaginated(res, { data: proposals, page, limit, total });
});

/**
 * Accept proposal
 */
const acceptProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  
  const proposal = await Proposal.findById(id);
  if (!proposal) {
    throw new NotFoundError('Proposal not found');
  }

  const job = await Job.findById(proposal.jobId);
  if (!job) throw new NotFoundError('Job not found');
  // Ownership: only the client who OWNS the job may accept a proposal on it.
  if (String(job.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('You can only accept proposals on your own projects');
  }
  if (job.status !== 'open') {
    return res.status(400).json({ success: false, message: `Cannot accept proposal. Job is already ${job.status}` });
  }

  proposal.status = 'accepted';
  proposal.clientResponse = message;
  proposal.respondedAt = new Date();
  await proposal.save();
  
  // Update job: move to in-progress and assign freelancer
  job.status = 'in-progress';
  job.hiredFreelancer = proposal.freelancerId;
  await job.save();

  // Automatically reject other pending proposals
  await Proposal.updateMany(
    { jobId: job._id, _id: { $ne: proposal._id }, status: 'pending' },
    { $set: { status: 'rejected', clientResponse: 'Position filled', respondedAt: new Date() } }
  );

  // Notify the hired freelancer.
  notifications.onProposalAccepted(proposal.freelancerId, { job });

  sendSuccess(res, {
    message: 'Proposal accepted successfully',
    data: { proposal }
  });
});

/**
 * Reject proposal
 */
const rejectProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const proposal = await Proposal.findById(id);
  if (!proposal) {
    throw new NotFoundError('Proposal not found');
  }
  // Ownership: only the client who owns the job may reject a proposal on it.
  const job = await Job.findById(proposal.jobId).select('clientId title');
  if (!job) throw new NotFoundError('Job not found');
  if (String(job.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('You can only reject proposals on your own projects');
  }

  proposal.status = 'rejected';
  proposal.clientResponse = reason;
  proposal.respondedAt = new Date();
  await proposal.save();

  notifications.onProposalRejected(proposal.freelancerId, { job });
  
  sendSuccess(res, {
    message: 'Proposal rejected',
    data: { proposal }
  });
});

/**
 * Withdraw proposal
 */
const withdrawProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const proposal = await Proposal.findById(id);
  if (!proposal) {
    throw new NotFoundError('Proposal not found');
  }
  if (String(proposal.freelancerId) !== String(req.user._id)) {
    throw new ForbiddenError('You can only withdraw your own proposals');
  }

  proposal.status = 'withdrawn';
  await proposal.save();

  sendSuccess(res, {
    message: 'Proposal withdrawn successfully'
  });
});

/**
 * Delete proposal
 */
const deleteProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const proposal = await Proposal.findById(id).select('freelancerId jobId');
  if (!proposal) {
    throw new NotFoundError('Proposal not found');
  }
  if (String(proposal.freelancerId) !== String(req.user._id)) {
    throw new ForbiddenError('You can only delete your own proposals');
  }

  // Keep the job's proposals array consistent.
  await Job.findByIdAndUpdate(proposal.jobId, { $pull: { proposals: proposal._id } });
  await Proposal.deleteOne({ _id: id });

  sendSuccess(res, {
    message: 'Proposal deleted successfully'
  });
});

/**
 * AI: draft a proposal cover letter for a job, personalised to the logged-in
 * freelancer's profile. Freelancer-only. Returns { coverLetter }.
 */
const draftProposal = asyncHandler(async (req, res) => {
  const { jobId } = req.body;
  const userId = req.user._id;

  const job = await Job.findById(jobId).select('title description skills category budget');
  if (!job) throw new NotFoundError('Job not found');

  const profile = await FreelancerProfile.findOne({ userId }).lean();
  const u = req.user;

  const result = await getAIProvider().draftProposal(
    {
      title: job.title,
      description: job.description,
      skills: job.skills,
      category: job.category,
      budget: job.budget,
    },
    {
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      title: profile?.title || '',
      bio: profile?.bio || '',
      experienceLevel: profile?.experienceLevel || '',
      skills: (profile?.skills || []).map((s) => (typeof s === 'object' ? s.name : s)).filter(Boolean),
    }
  );

  sendSuccess(res, {
    message: 'Proposal draft generated',
    data: result,
  });
});

module.exports = {
  createProposal,
  updateProposal,
  getProposalById,
  listProposals,
  acceptProposal,
  rejectProposal,
  withdrawProposal,
  deleteProposal,
  draftProposal
};
