const Proposal = require('../models/Proposal');
const Job = require('../models/Job');
const FreelancerProfile = require('../models/FreelancerProfile');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Submit proposal (freelancer only)
 * POST /api/proposals
 */
const submitProposal = asyncHandler(async (req, res) => {
  const { jobId, ...proposalData } = req.body;

  // Check if job exists and is active
  const job = await Job.findById(jobId);
  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  if (job.status !== 'active') {
    throw new ApiError(400, 'Job is not accepting proposals');
  }

  // Check if already submitted
  const existingProposal = await Proposal.findOne({
    jobId,
    freelancerId: req.user._id,
  });

  if (existingProposal) {
    throw new ApiError(400, 'You have already submitted a proposal for this job');
  }

  // Create proposal
  const proposal = await Proposal.create({
    jobId,
    freelancerId: req.user._id,
    ...proposalData,
  });

  // Update job proposal count
  job.proposals += 1;
  await job.save();

  // Update freelancer stats
  await FreelancerProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $inc: { totalProposals: 1 } }
  );

  res.status(201).json(
    new ApiResponse(201, proposal, 'Proposal submitted successfully')
  );
});

/**
 * Get proposals for a job (client only)
 * GET /api/proposals/job/:jobId
 */
const getJobProposals = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  // Verify job ownership
  const job = await Job.findOne({ _id: jobId, clientId: req.user._id });
  if (!job) {
    throw new ApiError(404, 'Job not found or unauthorized');
  }

  const proposals = await Proposal.find({ jobId })
    .populate('freelancerId', 'email')
    .populate({
      path: 'freelancerId',
      populate: {
        path: 'profile',
        model: 'FreelancerProfile',
      },
    })
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, proposals, 'Proposals retrieved successfully')
  );
});

/**
 * Get my proposals (freelancer only)
 * GET /api/proposals/my
 */
const getMyProposals = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const query = { freelancerId: req.user._id };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [proposals, total] = await Promise.all([
    Proposal.find(query)
      .populate('jobId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Proposal.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      proposals,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    }, 'Proposals retrieved successfully')
  );
});

/**
 * Accept proposal (client only)
 * PATCH /api/proposals/:id/accept
 */
const acceptProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const proposal = await Proposal.findById(id).populate('jobId');

  if (!proposal) {
    throw new ApiError(404, 'Proposal not found');
  }

  // Verify job ownership
  if (proposal.jobId.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized');
  }

  proposal.status = 'accepted';
  proposal.respondedAt = new Date();
  await proposal.save();

  // Update job
  const job = await Job.findById(proposal.jobId._id);
  job.status = 'in-progress';
  job.hiredFreelancer = proposal.freelancerId;
  await job.save();

  // Reject other proposals
  await Proposal.updateMany(
    { jobId: proposal.jobId._id, _id: { $ne: id } },
    { status: 'rejected', respondedAt: new Date() }
  );

  res.status(200).json(
    new ApiResponse(200, proposal, 'Proposal accepted successfully')
  );
});

/**
 * Reject proposal (client only)
 * PATCH /api/proposals/:id/reject
 */
const rejectProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const proposal = await Proposal.findById(id).populate('jobId');

  if (!proposal) {
    throw new ApiError(404, 'Proposal not found');
  }

  // Verify job ownership
  if (proposal.jobId.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized');
  }

  proposal.status = 'rejected';
  proposal.respondedAt = new Date();
  await proposal.save();

  res.status(200).json(
    new ApiResponse(200, proposal, 'Proposal rejected successfully')
  );
});

/**
 * Withdraw proposal (freelancer only)
 * PATCH /api/proposals/:id/withdraw
 */
const withdrawProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const proposal = await Proposal.findOne({
    _id: id,
    freelancerId: req.user._id,
  });

  if (!proposal) {
    throw new ApiError(404, 'Proposal not found or unauthorized');
  }

  if (proposal.status !== 'pending') {
    throw new ApiError(400, 'Cannot withdraw a proposal that has been responded to');
  }

  proposal.status = 'withdrawn';
  await proposal.save();

  // Decrement job proposal count
  await Job.findByIdAndUpdate(proposal.jobId, { $inc: { proposals: -1 } });

  res.status(200).json(
    new ApiResponse(200, proposal, 'Proposal withdrawn successfully')
  );
});

module.exports = {
  submitProposal,
  getJobProposals,
  getMyProposals,
  acceptProposal,
  rejectProposal,
  withdrawProposal,
};
