const Proposal = require('../models/Proposal');
const Job = require('../models/Job');
const Contract = require('../models/Contract');
const ContractHistory = require('../models/ContractHistory');
const Milestone = require('../models/Milestone');
const FreelancerProfile = require('../models/FreelancerProfile');
const ClientProfile = require('../models/ClientProfile');
const { sendSuccess, sendCreated, sendPaginated, sendError } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/apiError');
const { getAIProvider } = require('../services/ai');
const { checkSkillGate } = require('../utils/skillGating');
const notifications = require('../services/notification.service');
const { fundMilestoneFromWallet } = require('../services/milestone.service');
const { estimateWeeklyLockAmount, lockHourlyEscrow } = require('../services/hourlyEscrow.service');
const { round2 } = require('../utils/constants');
const { stripHtml } = require('../utils/sanitizeInput');

/**
 * Create proposal.
 * Skill-gated: the freelancer must have passed (verified) at least one skill
 * matching the job's required skills / category before applying.
 */
const createProposal = asyncHandler(async (req, res) => {
  const proposalData = req.body;
  const freelancerId = req.user._id;

  // Prevent duplicate applications
  const existingProposal = await Proposal.findOne({ jobId: proposalData.jobId, freelancerId });
  if (existingProposal) {
    throw new BadRequestError('You have already applied to this project.');
  }

  // Need the job's required skills + category + budget to gate the application.
  const job = await Job.findById(proposalData.jobId).select('skills category experienceLevel clientId title budget status contractId');
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  if (job.status !== 'open') {
    throw new ForbiddenError('This job is no longer accepting proposals.');
  }
  if (job.contractId) {
    throw new ForbiddenError('An active contract already exists for this job.');
  }

  // Validate explicit fields based on job type
  const isMissing = (v) => v === undefined || v === null || v === '';
  const isHourly = job.budget?.type === 'hourly';
  if (isHourly) {
    if (isMissing(proposalData.hourlyRate) || isMissing(proposalData.estimatedWeeklyHours)) {
      throw new ForbiddenError('Hourly proposals must include hourlyRate and estimatedWeeklyHours.');
    }
  } else {
    if (isMissing(proposalData.fixedPrice) || isMissing(proposalData.estimatedDeliveryTime)) {
      throw new ForbiddenError('Fixed-price proposals must include fixedPrice and estimatedDeliveryTime.');
    }
  }

  const gate = await checkSkillGate(freelancerId, job.skills, job.category, job.experienceLevel);
  if (!gate.allowed) {
    const levelLabel = { entry: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' }[job.experienceLevel];
    return sendError(res, {
      statusCode: 403,
      message: levelLabel
        ? `This project requires ${levelLabel}-level verification in at least one of its required skills before you can apply.`
        : 'You need to pass the skill test for this project’s required skills before you can apply. Verify at least one of them to continue.',
      errors: {
        skillTestRequired: true,
        requiredSkills: job.skills || [],
        category: job.category || '',
        requiredLevel: job.experienceLevel || '',
        verifiedSkills: gate.verifiedSkills,
      },
    });
  }

  // Only content fields are ever taken from the body — lifecycle fields
  // (status, clientResponse, respondedAt) are never client-settable.
  const proposal = new Proposal({
    jobId: proposalData.jobId,
    fixedPrice: proposalData.fixedPrice,
    hourlyRate: proposalData.hourlyRate,
    estimatedDeliveryTime: proposalData.estimatedDeliveryTime,
    estimatedWeeklyHours: proposalData.estimatedWeeklyHours,
    attachments: proposalData.attachments,
    coverLetter: stripHtml(proposalData.coverLetter),
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

  // Allow-list only
  for (const key of ['coverLetter', 'fixedPrice', 'hourlyRate', 'estimatedDeliveryTime', 'estimatedWeeklyHours', 'attachments']) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      proposal[key] = key === 'coverLetter' ? stripHtml(req.body[key]) : req.body[key];
    }
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

  // Ownership: only the freelancer who submitted it, or the client who owns
  // the job it's on, may view a proposal's bid/cover-letter/identity —
  // matches the same check every other proposal endpoint already enforces.
  const isOwnerFreelancer = req.user.role === 'freelancer' && String(proposal.freelancerId?._id) === String(req.user._id);
  const isOwnerClient = req.user.role === 'client' && String(proposal.jobId?.clientId) === String(req.user._id);
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
  if (!isOwnerFreelancer && !isOwnerClient && !isAdmin) {
    throw new ForbiddenError('You do not have permission to view this proposal');
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

  // Security: If freelancer, only show their own proposals.
  // If client, only show proposals for jobs they own.
  if (req.user.role === 'freelancer') {
    query.freelancerId = req.user._id;
  } else if (req.user.role === 'client') {
    const myJobs = await Job.find({ clientId: req.user._id }).select('_id');
    const myJobIds = myJobs.map(j => String(j._id));
    
    if (jobId) {
      if (!myJobIds.includes(String(jobId))) {
        throw new ForbiddenError("You cannot view proposals for projects you don't own.");
      }
    } else {
      query.jobId = { $in: myJobIds };
    }
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
  const { message, milestones } = req.body;

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
  if (job.contractId) {
    throw new ForbiddenError('An active contract already exists for this job.');
  }

  const isHourly = job.budget?.type === 'hourly';

  // Fixed-price hires require 100% escrow lock — validate the milestone
  // breakdown and confirm the client can actually afford milestone 1 BEFORE
  // touching Proposal/Contract/Job at all. Hourly hires similarly require the
  // client to be able to lock one week's estimate (hourlyRate * proposed
  // weekly hours) before hiring. This app has no Mongo transactions, so
  // correctness comes from strict ordering: verify first, write after.
  let milestoneDefs = null;
  let hourlyLockAmount = 0;
  if (!isHourly) {
    const agreedPrice = round2(Number(proposal.fixedPrice) || 0);
    if (Array.isArray(milestones) && milestones.length > 0) {
      const sum = round2(milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0));
      if (sum !== agreedPrice) {
        throw new BadRequestError(`Milestone amounts must sum to the agreed price (Rs. ${agreedPrice}), got Rs. ${sum}`);
      }
      milestoneDefs = milestones.map((m, i) => ({
        order: i + 1,
        title: (m.title || `Milestone ${i + 1}`).trim(),
        amount: round2(Number(m.amount) || 0)
      }));
    } else {
      milestoneDefs = [{ order: 1, title: 'Full Project', amount: agreedPrice }];
    }

    const clientProfile = await ClientProfile.findOne({ userId: req.user._id });
    const balance = clientProfile?.walletBalance || 0;
    if (balance < milestoneDefs[0].amount) {
      return sendError(res, {
        statusCode: 400,
        message: `Insufficient wallet balance to fund escrow for this hire. Need Rs. ${milestoneDefs[0].amount}, have Rs. ${round2(balance)}. Please top up your wallet first.`,
        errors: { insufficientBalance: true, required: milestoneDefs[0].amount, available: round2(balance), contractType: 'fixed' }
      });
    }
  } else {
    hourlyLockAmount = estimateWeeklyLockAmount({
      hourlyRate: proposal.hourlyRate,
      weeklyLimit: proposal.estimatedWeeklyHours
    });

    const clientProfile = await ClientProfile.findOne({ userId: req.user._id });
    const balance = clientProfile?.walletBalance || 0;
    if (hourlyLockAmount > 0 && balance < hourlyLockAmount) {
      return sendError(res, {
        statusCode: 400,
        message: `Insufficient wallet balance to lock escrow for this hire. Need Rs. ${hourlyLockAmount} (one week's estimate at Rs. ${proposal.hourlyRate}/hr × ${proposal.estimatedWeeklyHours} hrs), have Rs. ${round2(balance)}. Please top up your wallet first.`,
        errors: { insufficientBalance: true, required: hourlyLockAmount, available: round2(balance), contractType: 'hourly' }
      });
    }
  }

  // Atomically claim the job before writing anything else. The checks above
  // (job.status !== 'open', job.contractId) are a plain read — two accept
  // requests on two different proposals for the same job (or the same
  // proposal double-submitted) could both pass them before either writes.
  // This conditional update can only succeed for exactly one concurrent
  // request; the loser aborts here, before any Proposal/Contract/Milestone
  // record — or wallet debit — exists, so there's nothing to clean up.
  const claimedJob = await Job.findOneAndUpdate(
    { _id: job._id, status: 'open', contractId: { $exists: false } },
    { $set: { status: 'in-progress', hiredFreelancer: proposal.freelancerId } },
    { new: true }
  );
  if (!claimedJob) {
    throw new BadRequestError('This project is no longer open — another proposal may have just been accepted.');
  }

  proposal.status = 'accepted';
  proposal.clientResponse = message;
  proposal.respondedAt = new Date();
  await proposal.save();

  // Create Contract
  const contract = new Contract({
    jobId: job._id,
    proposalId: proposal._id,
    clientId: job.clientId,
    freelancerId: proposal.freelancerId,
    type: isHourly ? 'hourly' : 'fixed',
    status: 'active',
    // Fixed hires lock milestone 1 below (paymentStatus becomes 'funded' there
    // implicitly via the milestone); hourly hires lock their weekly estimate
    // right after this contract is saved and paymentStatus becomes
    // 'wallet_locked' inside lockHourlyEscrow.
    paymentStatus: isHourly ? 'pending' : 'funded',

    // Copy the agreed upon terms from the proposal
    fixedPrice: proposal.fixedPrice,
    hourlyRate: proposal.hourlyRate,
    weeklyLimit: proposal.estimatedWeeklyHours,
    milestoneMode: !!(milestoneDefs && milestoneDefs.length > 1),
    ...(isHourly ? { hourlyEscrow: { weeklyLockAmount: hourlyLockAmount } } : {})
  });

  await contract.save();

  // Create ContractHistory
  await ContractHistory.create({
    contractId: contract._id,
    action: 'created',
    newValue: { status: 'active' },
    performedBy: req.user._id
  });

  // Create the milestone(s) — fixed-price only. Hourly contracts keep using
  // weekly time-tracking invoices, not escrow milestones.
  let createdMilestones = [];
  if (!isHourly) {
    createdMilestones = await Milestone.insertMany(
      milestoneDefs.map((m) => ({ ...m, contractId: contract._id, jobId: job._id }))
    );
  }

  // Update job: move to in-progress, assign freelancer, set contractId
  job.status = 'in-progress';
  job.hiredFreelancer = proposal.freelancerId;
  job.contractId = contract._id;
  await job.save();

  // Automatically reject other pending proposals
  await Proposal.updateMany(
    { jobId: job._id, _id: { $ne: proposal._id }, status: 'pending' },
    { $set: { status: 'rejected', clientResponse: 'Position filled', respondedAt: new Date() } }
  );

  // Lock escrow now that the contract/milestone records exist. Balance was
  // already confirmed sufficient above.
  if (!isHourly) {
    await fundMilestoneFromWallet({
      milestone: createdMilestones[0],
      job,
      contract,
      clientId: req.user._id,
      performedBy: req.user._id
    });
  } else if (hourlyLockAmount > 0) {
    await lockHourlyEscrow({
      contract,
      job,
      clientId: req.user._id,
      amount: hourlyLockAmount,
      performedBy: req.user._id,
      initial: true
    });
  }

  // Notify the hired freelancer.
  notifications.onProposalAccepted(proposal.freelancerId, { job });

  sendSuccess(res, {
    message: 'Proposal accepted successfully',
    data: { proposal, contract, milestones: createdMilestones }
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

  const proposal = await Proposal.findById(id).select('freelancerId jobId status');
  if (!proposal) {
    throw new NotFoundError('Proposal not found');
  }
  if (String(proposal.freelancerId) !== String(req.user._id)) {
    throw new ForbiddenError('You can only delete your own proposals');
  }
  if (proposal.status === 'accepted') {
    throw new BadRequestError('You cannot delete an accepted proposal. Contact the client to cancel the contract.');
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
