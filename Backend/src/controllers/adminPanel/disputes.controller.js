const Contract = require('../../models/Contract');
const Payment = require('../../models/Payment');
const Milestone = require('../../models/Milestone');
const Job = require('../../models/Job');
const FreelancerProfile = require('../../models/FreelancerProfile');
const ClientProfile = require('../../models/ClientProfile');
const ContractHistory = require('../../models/ContractHistory');
const { auditLog } = require('../../utils/adminAudit');
const notifications = require('../../services/notification.service');
const { PLATFORM_FEE_RATE, round2 } = require('../../utils/constants');
const { finalizeJobCompletion } = require('../../services/jobCompletion.service');
const { getEscrowReleaseDays } = require('../../services/milestone.service');
const { refundRemainingHourlyEscrow, releaseRemainingHourlyEscrow, splitRemainingHourlyEscrow } = require('../../services/hourlyEscrow.service');
const { parsePagination } = require('../../utils/helpers');

// A 'split' resolution with no percentage (or one outside 1-99) previously
// fell through to marking the dispute/milestone resolved with ZERO money
// moved — real escrow funds landing in a terminal, unrecoverable state.
// Validated once, before either resolution path claims the dispute.
const isValidSplitPercentage = (splitPercentage) => {
  const n = Number(splitPercentage);
  return Number.isFinite(n) && n >= 1 && n <= 99;
};

const getDisputes = async (req, res) => {
  try {
    const { status } = req.query;
    const { page, limit } = parsePagination(req.query);
    const filter = { 'dispute.status': { $exists: true } };
    if (status) filter['dispute.status'] = status;

    // Hourly contracts dispute at the contract level (as before); fixed-price
    // contracts dispute a specific Milestone. Merge both into one list so the
    // admin sees a single Disputes queue regardless of contract type.
    const [hourlyDisputes, milestoneDisputesRaw] = await Promise.all([
      Contract.find({ ...filter, type: 'hourly' })
        .populate('clientId', 'email firstName lastName')
        .populate('freelancerId', 'email firstName lastName')
        .populate('jobId', 'title')
        .lean(),
      Milestone.find(filter).lean()
    ]);

    const contractIds = [...new Set(milestoneDisputesRaw.map((m) => String(m.contractId)))];
    const parentContracts = contractIds.length
      ? await Contract.find({ _id: { $in: contractIds } })
        .populate('clientId', 'email firstName lastName')
        .populate('freelancerId', 'email firstName lastName')
        .populate('jobId', 'title')
        .lean()
      : [];
    const contractMap = new Map(parentContracts.map((c) => [String(c._id), c]));

    const milestoneDisputes = milestoneDisputesRaw
      .map((m) => {
        const contract = contractMap.get(String(m.contractId));
        if (!contract) return null;
        return {
          _id: contract._id, // reuse the contract id — getDisputeById/resolveDispute both key off contractId
          type: 'fixed',
          milestoneId: m._id,
          milestoneOrder: m.order,
          milestoneTitle: m.title,
          milestoneAmount: m.amount,
          clientId: contract.clientId,
          freelancerId: contract.freelancerId,
          jobId: contract.jobId,
          dispute: m.dispute
        };
      })
      .filter(Boolean);

    const merged = [...hourlyDisputes, ...milestoneDisputes]
      .sort((a, b) => new Date(b.dispute?.raisedAt || 0) - new Date(a.dispute?.raisedAt || 0));

    const skip = (page - 1) * limit;
    const paged = merged.slice(skip, skip + limit);

    return res.status(200).json({
      success: true, disputes: paged,
      pagination: { total: merged.length, page, limit, pages: Math.ceil(merged.length / limit) }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
};

const getDisputeById = async (req, res) => {
  try {
    const Delivery = require('../../models/Delivery');
    const Conversation = require('../../models/Conversation');
    const Message = require('../../models/Message');
    const TimeLog = require('../../models/TimeLog');
    const Gig = require('../../models/Gig');

    const contract = await Contract.findById(req.params.contractId)
      .populate('clientId', 'email firstName lastName profilePicture')
      .populate('freelancerId', 'email firstName lastName profilePicture')
      .populate('jobId', 'title budget source gigId gigTier')
      .lean();

    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    // Full context for an informed decision: history, escrow, deliveries,
    // logged hours (hourly contracts), and the complete chat (with
    // attachments) between the two parties.
    const [history, payment, deliveries, milestones, timeLogs] = await Promise.all([
      ContractHistory.find({ contractId: contract._id })
        .populate('performedBy', 'email firstName lastName')
        .sort({ createdAt: 1 }).lean(),
      Payment.findOne({ contractId: contract._id }).lean(),
      Delivery.find({ contractId: contract._id }).sort({ version: 1 }).lean(),
      contract.type === 'fixed'
        ? Milestone.find({ contractId: contract._id }).sort({ order: 1 }).lean()
        : Promise.resolve([]),
      contract.type === 'hourly'
        ? TimeLog.find({ contractId: contract._id }).sort({ startTime: 1 }).lean()
        : Promise.resolve([])
    ]);

    // For fixed-price contracts, the disputed milestone's own escrow Payment
    // is the one that matters here — the top-level `payment` above only
    // finds the FIRST Payment row for this contract (there's one per
    // milestone), which is wrong once there's more than one milestone.
    const disputedMilestone = milestones.find((m) => m.dispute?.status === 'pending');
    const milestonePayment = disputedMilestone
      ? await Payment.findOne({ milestoneId: disputedMilestone._id }).lean()
      : null;

    // Gig-sourced jobs only copy a title/description onto the Job at order
    // time — the admin also needs the ordered tier's own price/delivery/
    // revisions/features, and the Gig's original listing, to judge the
    // dispute against what was actually promised.
    const gig = (contract.jobId?.source === 'gig' && contract.jobId?.gigId)
      ? await Gig.findById(contract.jobId.gigId).select('title shortDescription fullDescription pricing').lean()
      : null;

    // Find the conversation between the two parties and pull all messages.
    let messages = [];
    let conversationId = null;
    const clientId = contract.clientId?._id || contract.clientId;
    const freelancerId = contract.freelancerId?._id || contract.freelancerId;
    if (clientId && freelancerId) {
      const conversation = await Conversation.findOne({
        participants: { $all: [clientId, freelancerId] }
      }).lean();
      if (conversation) {
        conversationId = conversation._id;
        messages = await Message.find({ conversationId: conversation._id })
          .populate('sender', 'email firstName lastName profilePicture')
          .sort({ createdAt: 1 })
          .lean();
      }
    }

    return res.status(200).json({
      success: true, contract, history, payment, deliveries,
      // Fixed-price only: the full milestone breakdown, which one is
      // disputed, and that specific milestone's escrow Payment (not just the
      // contract's first Payment row, which is ambiguous once there's more
      // than one milestone).
      milestones, disputedMilestone, milestonePayment,
      // Hourly only: every logged time entry, for admins to weigh against the
      // dispute reason.
      timeLogs,
      // Gig-sourced only: the ordered tier's terms + the gig's own listing.
      gig,
      conversation: { id: conversationId, messages }
    });
  } catch (err) {
    console.error('[Disputes] getDisputeById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load dispute' });
  }
};

/**
 * Fixed-price dispute resolution — same 5 actions as the hourly path below,
 * but scoped to the ONE disputed Milestone and its own escrow Payment
 * (a fixed-price contract can have several Payment rows, one per milestone,
 * so resolving at the contract level the way the hourly path does would be
 * ambiguous). Called from resolveDispute() when contract.type === 'fixed'.
 *
 * Per product decision: a resolution only ever settles the disputed
 * milestone — it never itself ends the whole contract. If this happens to be
 * the LAST milestone, the contract/job naturally complete (same as a normal
 * approval would); otherwise the contract returns to 'active' and the next
 * milestone can be funded normally. If admins want to end the project early
 * after a dispute, that's the separate, already-existing forceComplete/
 * cancelContract admin tools — not a responsibility of dispute resolution.
 */
async function resolveMilestoneDispute(req, res, { contract, action, notes, splitPercentage }) {
  // Validate the action BEFORE claiming the dispute — otherwise an invalid
  // action would still flip it to 'resolved' below and then bail out on the
  // switch's default case, permanently losing the ability to resolve it.
  if (!['release_freelancer', 'refund_client', 'split', 'cancel_contract', 'resume', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid resolution action' });
  }
  if (action === 'split' && !isValidSplitPercentage(splitPercentage)) {
    return res.status(400).json({ success: false, message: 'A split resolution requires splitPercentage between 1 and 99' });
  }

  // Disputes can now be raised before a milestone is ever funded (a client
  // who stalls on funding), so there may be no escrow Payment to move money
  // out of. Peek at that (read-only) BEFORE claiming the dispute, so a
  // mismatched action — financial action with no escrow, or "cancel" when
  // there actually IS funded escrow to resolve — gets rejected without
  // burning the atomic claim below.
  const isFinancialAction = ['release_freelancer', 'refund_client', 'split'].includes(action);
  const pendingMilestone = await Milestone.findOne({ contractId: contract._id, 'dispute.status': 'pending' });
  if (!pendingMilestone) {
    return res.status(409).json({ success: false, message: 'No active milestone dispute on this contract, or it was already resolved by another request' });
  }
  const pendingPayment = await Payment.findOne({ milestoneId: pendingMilestone._id, type: 'job_escrow' });
  if (isFinancialAction && !pendingPayment) {
    return res.status(400).json({ success: false, message: 'This milestone was never funded — there is no escrow to release, refund, or split. Use "Cancel Contract" instead.' });
  }
  if (action === 'cancel_contract' && pendingPayment) {
    return res.status(400).json({ success: false, message: 'This milestone has funded escrow — use release, refund, or split instead of cancelling.' });
  }

  // Atomic claim — only the request that actually flips 'pending' → 'resolved'
  // proceeds to move money. A concurrent second call (double-click, retry)
  // matches nothing and is rejected with 409 instead of double-processing.
  const milestone = await Milestone.findOneAndUpdate(
    { contractId: contract._id, 'dispute.status': 'pending' },
    { $set: { 'dispute.status': 'resolved', 'dispute.resolvedAt': new Date(), 'dispute.resolutionNotes': notes } },
    { new: true }
  );
  if (!milestone) {
    return res.status(409).json({ success: false, message: 'No active milestone dispute on this contract, or it was already resolved by another request' });
  }

  const payment = await Payment.findOne({ milestoneId: milestone._id, type: 'job_escrow' });
  const totalMilestones = await Milestone.countDocuments({ contractId: contract._id });
  const isLastMilestone = milestone.order >= totalMilestones;
  let freelancerPayout = 0;
  // Loaded once here (used by every case below for notifications, and by
  // the isLastMilestone/cancel_contract branches further down) instead of
  // each of those re-fetching it separately.
  const job = await Job.findById(contract.jobId);

  switch (action) {
    case 'release_freelancer': {
      if (payment && payment.status !== 'released') {
        const fee = round2(payment.totalAmount * (payment.feeRate || PLATFORM_FEE_RATE));
        payment.platformFee = fee;
        payment.freelancerPayout = round2(payment.totalAmount - fee);
        payment.status = 'released';
        payment.releasedAt = new Date();
        await payment.save();
        freelancerPayout = payment.freelancerPayout;
        await FreelancerProfile.updateOne(
          { userId: contract.freelancerId },
          { $inc: { walletBalance: freelancerPayout, totalEarnings: Math.round(freelancerPayout) } }
        );
        notifications.onDisputeResolved(contract.freelancerId, { job, resolution: 'release_freelancer', amount: freelancerPayout, recipientRole: 'freelancer' });
        notifications.onDisputeResolved(contract.clientId, { job, resolution: 'release_freelancer', amount: freelancerPayout, recipientRole: 'client' });
      }
      milestone.status = 'released';
      milestone.releasedAt = new Date();
      break;
    }
    case 'refund_client': {
      if (payment && payment.status !== 'refunded') {
        payment.status = 'refunded';
        await payment.save();
        await ClientProfile.updateOne({ userId: contract.clientId }, { $inc: { walletBalance: payment.totalAmount } });
        notifications.onDisputeResolved(contract.clientId, { job, resolution: 'refund_client', amount: payment.totalAmount, recipientRole: 'client' });
        notifications.onDisputeResolved(contract.freelancerId, { job, resolution: 'refund_client', recipientRole: 'freelancer' });
      }
      milestone.status = 'refunded';
      break;
    }
    case 'split': {
      if (payment && splitPercentage != null) {
        const freelancerShare = round2(payment.totalAmount * (splitPercentage / 100));
        const clientRefund = round2(payment.totalAmount - freelancerShare);
        const fee = round2(freelancerShare * (payment.feeRate || PLATFORM_FEE_RATE));
        payment.status = 'released';
        payment.platformFee = fee;
        payment.freelancerPayout = round2(freelancerShare - fee);
        payment.releasedAt = new Date();
        await payment.save();
        freelancerPayout = payment.freelancerPayout;
        await FreelancerProfile.updateOne(
          { userId: contract.freelancerId },
          { $inc: { walletBalance: freelancerPayout, totalEarnings: Math.round(freelancerPayout) } }
        );
        await ClientProfile.updateOne({ userId: contract.clientId }, { $inc: { walletBalance: clientRefund } });
        notifications.onDisputeResolved(contract.freelancerId, { job, resolution: 'split', amount: freelancerPayout, recipientRole: 'freelancer' });
        notifications.onDisputeResolved(contract.clientId, { job, resolution: 'split', amount: clientRefund, recipientRole: 'client' });
      }
      milestone.status = 'released';
      milestone.releasedAt = new Date();
      break;
    }
    case 'cancel_contract': {
      // Nothing was ever funded for this milestone — there's no escrow to
      // move. End the contract/job outright rather than pretending a normal
      // payout or refund happened.
      milestone.status = 'cancelled';
      break;
    }
    case 'resume':
    case 'reject': {
      // Dismiss the dispute — put the milestone back to 'submitted' so the
      // client reviews it normally, with a fresh auto-release window.
      milestone.status = 'submitted';
      milestone.reviewDeadline = new Date(Date.now() + (await getEscrowReleaseDays()) * 24 * 60 * 60 * 1000);
      notifications.onDisputeDismissed(contract.clientId, { job, recipientRole: 'client' });
      notifications.onDisputeDismissed(contract.freelancerId, { job, recipientRole: 'freelancer' });
      break;
    }
  }

  await milestone.save();

  if (isFinancialAction) {
    if (isLastMilestone) {
      contract.status = 'completed';
      contract.completedAt = new Date();
      if (job && job.status !== 'completed') {
        job.status = 'completed';
        job.completedAt = new Date();
        // Wallet/earnings for this milestone were already credited above —
        // only roll up completedProjects/totalSpent here.
        await finalizeJobCompletion(job, { freelancerEarning: freelancerPayout, clientSpend: payment?.totalAmount || 0, skipEarningsCredit: true });
      }
    } else {
      contract.status = 'active';
      contract.currentMilestoneOrder = milestone.order + 1;
    }
  } else if (action === 'cancel_contract') {
    contract.status = 'cancelled';
    // Any later milestone this contract never got to is moot now — leaving
    // them at 'pending_funding' would dangle under a cancelled contract.
    await Milestone.updateMany(
      { contractId: contract._id, _id: { $ne: milestone._id }, status: { $in: ['pending_funding', 'funded'] } },
      { $set: { status: 'cancelled' } }
    );
    if (job && !['completed', 'cancelled'].includes(job.status)) {
      job.status = 'cancelled';
      await job.save();
    }
    // Same as adminPanel/contracts.controller.js's cancelContract — an admin
    // dispute resolution doesn't go through either party's own flow, so
    // neither has any other way to find out the contract just ended.
    notifications.onJobCancelled(contract.clientId, { job });
    notifications.onJobCancelled(contract.freelancerId, { job });
    // Flag the client so repeat non-funding is visible to admins later.
    await ClientProfile.updateOne(
      { userId: contract.clientId },
      { $push: { fundingFlags: {
        contractId: contract._id,
        milestoneId: milestone._id,
        reason: notes,
        flaggedBy: req.admin.email,
        flaggedAt: new Date()
      } } }
    );
  } else {
    contract.status = 'active'; // resume/reject just unfreezes the contract; same milestone is back under review
  }
  await contract.save();

  await ContractHistory.create({
    contractId: contract._id,
    action: 'milestone_dispute_resolved',
    notes: `[Admin] Milestone ${milestone.order} dispute resolved via "${action}". Notes: ${notes}`,
    performedByAdmin: req.admin.email
  });

  auditLog(req, {
    action: 'dispute.resolved',
    category: 'dispute',
    resource: 'Milestone',
    resourceId: milestone._id,
    newValue: { action, notes, splitPercentage },
    severity: 'critical'
  });

  return res.status(200).json({ success: true, message: `Milestone dispute resolved: ${action}` });
}

const resolveDispute = async (req, res) => {
  try {
    const { action, notes, splitPercentage } = req.body;
    const { contractId } = req.params;

    let contract = await Contract.findById(contractId);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    if (contract.type === 'fixed') {
      return await resolveMilestoneDispute(req, res, { contract, action, notes, splitPercentage });
    }

    // Validate the action BEFORE claiming the dispute — otherwise an invalid
    // action would still flip it to 'resolved' below and then bail out on the
    // switch's default case, permanently losing the ability to resolve it.
    if (!['release_freelancer', 'refund_client', 'split', 'resume', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid resolution action' });
    }
    if (action === 'split' && !isValidSplitPercentage(splitPercentage)) {
      return res.status(400).json({ success: false, message: 'A split resolution requires splitPercentage between 1 and 99' });
    }

    // Atomic claim (see resolveMilestoneDispute) — only the request that
    // actually flips 'pending' → 'resolved' proceeds to move money.
    const claimed = await Contract.findOneAndUpdate(
      { _id: contractId, 'dispute.status': 'pending' },
      { $set: { 'dispute.status': 'resolved', 'dispute.resolvedAt': new Date(), 'dispute.resolutionNotes': notes } },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({ success: false, message: 'No active dispute on this contract, or it was already resolved by another request' });
    }
    contract = claimed;
    const job = await Job.findById(contract.jobId);

    // Hourly escrow is a running lock on the CONTRACT
    // (contract.hourlyEscrow.lockedBalance), not a single Payment row — a
    // contract accumulates one Payment per lock/top-up/invoice over its
    // life, so `Payment.findOne({contractId})` here previously grabbed
    // whichever one happened to be first (commonly the original, now
    // partly-drawn-down lock) and paid out its full original `totalAmount`,
    // creating money that was never actually still escrowed. These helpers
    // settle the actual current `lockedBalance` instead, mirroring how a
    // normal contract-end refund already works.
    let freelancerPayout = 0;
    const isFinancialAction = ['release_freelancer', 'refund_client', 'split'].includes(action);

    switch (action) {
      case 'release_freelancer': {
        const result = await releaseRemainingHourlyEscrow({ contract, job });
        freelancerPayout = result.freelancerPayout;
        contract.status = 'completed';
        contract.completedAt = new Date();
        // releaseRemainingHourlyEscrow already notified the freelancer
        // (onPaymentReleased) — the client has no other way to find out.
        notifications.onDisputeResolved(contract.clientId, { job, resolution: 'release_freelancer', amount: freelancerPayout, recipientRole: 'client' });
        break;
      }
      case 'refund_client': {
        await refundRemainingHourlyEscrow({ contract, job });
        contract.status = 'cancelled';
        // refundRemainingHourlyEscrow already notified the client
        // (onEscrowRefunded) — the freelancer has no other way to find out.
        notifications.onDisputeResolved(contract.freelancerId, { job, resolution: 'refund_client', recipientRole: 'freelancer' });
        break;
      }
      case 'split': {
        const result = await splitRemainingHourlyEscrow({ contract, job, freelancerPercent: Number(splitPercentage) });
        freelancerPayout = result.freelancerPayout;
        contract.status = 'completed';
        contract.completedAt = new Date();
        // splitRemainingHourlyEscrow already notified the freelancer
        // (onPaymentReleased) — the client has no other way to find out,
        // and needs their OWN refund share, not the freelancer's payout.
        notifications.onDisputeResolved(contract.clientId, { job, resolution: 'split', amount: result.clientRefund, recipientRole: 'client' });
        break;
      }
      case 'resume': {
        contract.status = 'active';
        notifications.onDisputeDismissed(contract.clientId, { job, recipientRole: 'client' });
        notifications.onDisputeDismissed(contract.freelancerId, { job, recipientRole: 'freelancer' });
        break;
      }
      case 'reject': {
        // Dispute rejected — keep current state
        notifications.onDisputeDismissed(contract.clientId, { job, recipientRole: 'client' });
        notifications.onDisputeDismissed(contract.freelancerId, { job, recipientRole: 'freelancer' });
        break;
      }
    }

    if (isFinancialAction && job && job.status !== 'completed' && ['completed'].includes(contract.status)) {
      job.status = 'completed';
      job.completedAt = new Date();
      // releaseRemainingHourlyEscrow/splitRemainingHourlyEscrow already
      // credited the freelancer's wallet/earnings above — only roll up
      // completedProjects/totalSpent here.
      await finalizeJobCompletion(job, { freelancerEarning: freelancerPayout, clientSpend: contract.hourlyEscrow?.totalLocked || 0, skipEarningsCredit: true });
    }

    await contract.save();

    // Add history entry
    await ContractHistory.create({
      contractId,
      action: 'dispute_resolved',
      notes: `[Admin] Dispute resolved via "${action}". Notes: ${notes}`,
      performedByAdmin: req.admin.email
    });

    auditLog(req, {
      action: 'dispute.resolved',
      category: 'dispute',
      resource: 'Contract',
      resourceId: contract._id,
      newValue: { action, notes, splitPercentage },
      severity: 'critical'
    });

    return res.status(200).json({ success: true, message: `Dispute resolved: ${action}` });
  } catch (err) {
    console.error('[Disputes] resolve error:', err);
    return res.status(500).json({ success: false, message: 'Failed to resolve dispute' });
  }
};

module.exports = { getDisputes, getDisputeById, resolveDispute };
