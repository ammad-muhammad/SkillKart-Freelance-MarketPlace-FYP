const Proposal = require('../models/Proposal');
const Job = require('../models/Job');
const FreelancerProfile = require('../models/FreelancerProfile');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');
const { getAIProvider } = require('../services/ai');

/**
 * Create proposal
 */
const createProposal = asyncHandler(async (req, res) => {
  const proposalData = req.body;
  const freelancerId = req.user._id;
  
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
  
  sendCreated(res, 'Proposal submitted successfully', { proposal });
});

/**
 * Update proposal
 */
const updateProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const proposal = await Proposal.findById(id);
  if (!proposal) {
    throw new NotFoundError('Proposal not found');
  }
  
  Object.assign(proposal, updates);
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
  
  proposal.status = 'rejected';
  proposal.clientResponse = reason;
  proposal.respondedAt = new Date();
  await proposal.save();
  
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
