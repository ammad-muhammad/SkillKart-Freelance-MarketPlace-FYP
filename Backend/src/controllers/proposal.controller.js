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
 * Read-only precheck: would createProposal (or updateProposal's resubmit
 * path, below) let this freelancer through the skill gate for this job right
 * now? Lets the frontend gate opening the Apply/Resubmit modal itself (see
 * JobDetails.jsx) instead of the freelancer writing an entire proposal only
 * to hit this same 403 on submit. Freelancer-only; makes no writes.
 */
const checkApplyEligibility = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId).select('skills category experienceLevel');
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const gate = await checkSkillGate(req.user._id, job.skills, job.category, job.experienceLevel);

  sendSuccess(res, {
    message: 'Eligibility checked',
    data: {
      allowed: gate.allowed,
      requiredSkills: job.skills || [],
      category: job.category || '',
      requiredLevel: job.experienceLevel || '',
      verifiedSkills: gate.verifiedSkills,
    },
  });
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
  // Can edit while pending, or a rejected proposal the client explicitly
  // allowed to be revised and resubmitted. Anything else (accepted,
  // withdrawn, or rejected without that permission) is a dead end.
  const isResubmit = proposal.status === 'rejected' && proposal.canResubmit;
  if (proposal.status !== 'pending' && !isResubmit) {
    throw new ForbiddenError(`A "${proposal.status}" proposal can no longer be edited.`);
  }
  // Can't edit once the job itself is no longer open (covers paths that don't
  // bulk-reject pending proposals, e.g. auto-expiry or admin close/cancel).
  const job = await Job.findById(proposal.jobId).select('status clientId title skills category experienceLevel');
  if (job && job.status !== 'open') {
    throw new ForbiddenError('This job is no longer open, so the proposal can no longer be edited.');
  }

  // Resubmitting re-enters the marketplace exactly like a fresh application,
  // so it must clear the same skill gate createProposal enforces — otherwise
  // a freelancer whose verification has since expired (6-month window) could
  // resubmit straight into a pending review without ever re-proving
  // eligibility. Unlike a plain pending-edit window (short), the
  // reject-then-resubmit window is unbounded, so this can't be waved through.
  if (isResubmit && job) {
    const gate = await checkSkillGate(req.user._id, job.skills, job.category, job.experienceLevel);
    if (!gate.allowed) {
      const levelLabel = { entry: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' }[job.experienceLevel];
      return sendError(res, {
        statusCode: 403,
        message: levelLabel
          ? `This project requires ${levelLabel}-level verification in at least one of its required skills before you can resubmit.`
          : 'You need to pass the skill test for this project’s required skills before you can resubmit. Verify at least one of them to continue.',
        errors: {
          skillTestRequired: true,
          requiredSkills: job.skills || [],
          category: job.category || '',
          requiredLevel: job.experienceLevel || '',
          verifiedSkills: gate.verifiedSkills,
        },
      });
    }
  }

  // Allow-list only
  const updates = {};
  for (const key of ['coverLetter', 'fixedPrice', 'hourlyRate', 'estimatedDeliveryTime', 'estimatedWeeklyHours', 'attachments']) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      updates[key] = key === 'coverLetter' ? stripHtml(req.body[key]) : req.body[key];
    }
  }

  let saved;
  if (isResubmit) {
    // Atomic conditional write — a plain read-then-save here would let this
    // request race the client re-rejecting (or re-allowing) the same
    // proposal at nearly the same moment; only one of them should win.
    // Resubmitting also clears the OLD rejection's clientResponse/
    // respondedAt — otherwise the freelancer would see last time's "Client
    // Feedback" still displayed next to a fresh Pending badge, reading as if
    // the client already responded to the new submission.
    saved = await Proposal.findOneAndUpdate(
      { _id: proposal._id, status: 'rejected', canResubmit: true },
      { $set: { ...updates, status: 'pending', canResubmit: false, clientResponse: null, respondedAt: null } },
      { new: true }
    );
    if (!saved) {
      throw new ForbiddenError('This proposal is no longer eligible to be resubmitted (the client may have changed their mind).');
    }
  } else {
    Object.assign(proposal, updates);
    await proposal.save();
    saved = proposal;
  }

  if (isResubmit && job) {
    notifications.onProposalResubmitted(job.clientId, {
      job,
      freelancerName: [req.user.firstName, req.user.lastName].filter(Boolean).join(' '),
    });
  }

  sendSuccess(res, {
    message: isResubmit ? 'Proposal revised and resubmitted successfully' : 'Proposal updated successfully',
    data: { proposal: saved }
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
  const { message, milestones, expectedPrice } = req.body;

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
  // Price staleness guard: `updateProposal` lets a freelancer edit a still-
  // pending proposal's price at any time, including in the window between
  // the client opening "Accept" and actually confirming it. If the caller
  // tells us what price it displayed, reject when the live price has since
  // moved instead of silently funding/locking escrow for a number the client
  // never actually saw or agreed to.
  if (expectedPrice !== undefined && expectedPrice !== null) {
    const livePrice = job.budget?.type === 'hourly' ? proposal.hourlyRate : proposal.fixedPrice;
    if (round2(Number(expectedPrice)) !== round2(Number(livePrice) || 0)) {
      throw new BadRequestError('This proposal’s price has changed since you last viewed it — please refresh and review it again before accepting.');
    }
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
      // Every individual amount must be positive, not just the sum — a
      // negative entry offset by an inflated positive one still sums
      // correctly, but fundMilestoneFromWallet's atomic debit
      // ($inc: walletBalance: -milestone.amount) would then CREDIT the
      // client's wallet for that milestone instead of debiting it.
      if (milestones.some((m) => !(Number(m.amount) > 0))) {
        throw new BadRequestError('Each milestone amount must be greater than 0');
      }
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
    // Starts 'pending' for BOTH types — it only becomes 'funded'/
    // 'wallet_locked' once the fund/lock call below actually succeeds.
    // Setting 'funded' here unconditionally (the old code, fixed-price only)
    // would lie about escrow existing if that call then throws.
    paymentStatus: 'pending',

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

  // Automatically reject other pending proposals — keep the ids so they can
  // be put back to 'pending' below if funding ends up failing.
  const otherPendingIds = await Proposal.find(
    { jobId: job._id, _id: { $ne: proposal._id }, status: 'pending' }
  ).distinct('_id');
  if (otherPendingIds.length) {
    await Proposal.updateMany(
      { _id: { $in: otherPendingIds } },
      { $set: { status: 'rejected', clientResponse: 'Position filled', respondedAt: new Date() } }
    );
  }

  // Lock escrow now that the contract/milestone records exist. Balance was
  // already confirmed sufficient above, but that check (and the atomic job
  // claim) can't fully close a same-client race: accepting two DIFFERENT
  // proposals on two DIFFERENT jobs at nearly the same moment can both pass
  // the earlier balance pre-check against the same stale wallet figure, and
  // only one of the atomic debits inside fundMilestoneFromWallet/
  // lockHourlyEscrow can actually succeed. There are no Mongo transactions
  // in this app, so if the loser's fund/lock call throws here, everything
  // written above (proposal accepted, contract, milestones, job claimed,
  // other proposals auto-rejected) is otherwise a set of irreversible writes
  // with no automatic rollback — undo them by hand instead of leaving the
  // job stuck "in-progress" with a contract that was never actually funded.
  try {
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
  } catch (fundError) {
    await Job.updateOne({ _id: job._id }, { $set: { status: 'open' }, $unset: { hiredFreelancer: '', contractId: '' } });
    await Proposal.updateOne({ _id: proposal._id }, { $set: { status: 'pending' }, $unset: { clientResponse: '', respondedAt: '' } });
    if (otherPendingIds.length) {
      await Proposal.updateMany(
        { _id: { $in: otherPendingIds } },
        { $set: { status: 'pending' }, $unset: { clientResponse: '', respondedAt: '' } }
      );
    }
    if (createdMilestones.length) {
      await Milestone.deleteMany({ _id: { $in: createdMilestones.map((m) => m._id) } });
    }
    await ContractHistory.deleteMany({ contractId: contract._id });
    await Contract.deleteOne({ _id: contract._id });
    throw fundError;
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
  const { reason, allowResubmit } = req.body;

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
  // Only a still-pending proposal can be rejected — without this, an already
  // `accepted` proposal (with a live Contract/Milestone behind it) could be
  // flipped back to `rejected` (and, combined with canResubmit, back to
  // `pending`), leaving a Contract whose source Proposal no longer reflects
  // that it was ever accepted.
  if (proposal.status !== 'pending') {
    throw new BadRequestError(`A "${proposal.status}" proposal can no longer be rejected.`);
  }

  // Atomic claim — mirrors the same status precondition as a filter so a
  // concurrent request (e.g. a double-submitted reject, or racing the
  // freelancer's own in-flight resubmit) can't silently clobber whichever
  // write lands second.
  const rejected = await Proposal.findOneAndUpdate(
    { _id: proposal._id, status: 'pending' },
    { $set: { status: 'rejected', clientResponse: reason, respondedAt: new Date(), canResubmit: !!allowResubmit } },
    { new: true }
  );
  if (!rejected) {
    throw new BadRequestError('This proposal was already responded to.');
  }
  Object.assign(proposal, rejected.toObject());

  notifications.onProposalRejected(proposal.freelancerId, { job, canResubmit: proposal.canResubmit });
  
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
  if (proposal.status === 'accepted') {
    throw new BadRequestError('You cannot withdraw an accepted proposal — a contract already exists. Contact the client to end it.');
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
  checkApplyEligibility,
  updateProposal,
  getProposalById,
  listProposals,
  acceptProposal,
  rejectProposal,
  withdrawProposal,
  deleteProposal,
  draftProposal
};
