const Proposal = require('../models/Proposal');
const Job = require('../models/Job');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');

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
  
  proposal.status = 'accepted';
  proposal.clientResponse = message;
  proposal.respondedAt = new Date();
  await proposal.save();
  
  // Update job
  await Job.findByIdAndUpdate(proposal.jobId, {
    status: 'in-progress',
    hiredFreelancer: proposal.freelancerId
  });
  
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

module.exports = {
  createProposal,
  updateProposal,
  getProposalById,
  listProposals,
  acceptProposal,
  rejectProposal,
  withdrawProposal,
  deleteProposal
};
