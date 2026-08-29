const Contract = require('../../models/Contract');
const Payment = require('../../models/Payment');
const Milestone = require('../../models/Milestone');
const Job = require('../../models/Job');
const FreelancerProfile = require('../../models/FreelancerProfile');
const ClientProfile = require('../../models/ClientProfile');
const ContractHistory = require('../../models/ContractHistory');
const { auditLog } = require('../../utils/adminAudit');
const { PLATFORM_FEE_RATE, round2 } = require('../../utils/constants');
const { finalizeJobCompletion } = require('../../services/jobCompletion.service');
const { getEscrowReleaseDays } = require('../../services/milestone.service');

const getDisputes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paged = merged.slice(skip, skip + parseInt(limit));

    return res.status(200).json({
      success: true, disputes: paged,
      pagination: { total: merged.length, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(merged.length / parseInt(limit)) }
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

    const contract = await Contract.findById(req.params.contractId)
      .populate('clientId', 'email firstName lastName profilePicture')
      .populate('freelancerId', 'email firstName lastName profilePicture')
      .populate('jobId', 'title budget')
      .lean();

    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    // Full context for an informed decision: history, escrow, deliveries, and
    // the complete chat (with attachments) between the two parties.
    const [history, payment, deliveries, milestones] = await Promise.all([
      ContractHistory.find({ contractId: contract._id })
        .populate('performedBy', 'email firstName lastName')
        .sort({ createdAt: 1 }).lean(),
      Payment.findOne({ contractId: contract._id }).lean(),
      Delivery.find({ contractId: contract._id }).sort({ version: 1 }).lean(),
      contract.type === 'fixed'
        ? Milestone.find({ contractId: contract._id }).sort({ order: 1 }).lean()
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
  const milestone = await Milestone.findOne({ contractId: contract._id, 'dispute.status': 'pending' });
  if (!milestone) {
    return res.status(400).json({ success: false, message: 'No active milestone dispute on this contract' });
  }

  const payment = await Payment.findOne({ milestoneId: milestone._id, type: 'job_escrow' });
  const totalMilestones = await Milestone.countDocuments({ contractId: contract._id });
  const isLastMilestone = milestone.order >= totalMilestones;
  let freelancerPayout = 0;
  const isFinancialAction = ['release_freelancer', 'refund_client', 'split'].includes(action);

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
      }
      milestone.status = 'released';
      milestone.releasedAt = new Date();
      break;
    }
    case 'resume':
    case 'reject': {
      // Dismiss the dispute — put the milestone back to 'submitted' so the
      // client reviews it normally, with a fresh auto-release window.
      milestone.status = 'submitted';
      milestone.reviewDeadline = new Date(Date.now() + (await getEscrowReleaseDays()) * 24 * 60 * 60 * 1000);
      break;
    }
    default:
      return res.status(400).json({ success: false, message: 'Invalid resolution action' });
  }

  milestone.dispute.status = 'resolved';
  milestone.dispute.resolvedAt = new Date();
  milestone.dispute.resolutionNotes = notes;
  await milestone.save();

  if (isFinancialAction) {
    if (isLastMilestone) {
      contract.status = 'completed';
      contract.completedAt = new Date();
      const job = await Job.findById(contract.jobId);
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

    const contract = await Contract.findById(contractId);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    if (contract.type === 'fixed') {
      return await resolveMilestoneDispute(req, res, { contract, action, notes, splitPercentage });
    }

    if (!contract.dispute || contract.dispute.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No active dispute on this contract' });
    }

    const payment = await Payment.findOne({ contractId });

    // Apply resolution action
    switch (action) {
      case 'release_freelancer': {
        // Release full escrow to freelancer
        if (payment) {
          const fee = round2(payment.totalAmount * (payment.feeRate || PLATFORM_FEE_RATE));
          payment.platformFee = fee;
          payment.freelancerPayout = round2(payment.totalAmount - fee);
          payment.status = 'released';
          payment.releasedAt = new Date();
          await payment.save();
        }
        // Update freelancer wallet
        await FreelancerProfile.updateOne(
          { userId: contract.freelancerId },
          { $inc: { walletBalance: payment ? payment.freelancerPayout : 0, totalEarnings: payment ? payment.freelancerPayout : 0 } }
        );
        contract.status = 'completed';
        contract.completedAt = new Date();
        break;
      }
      case 'refund_client': {
        if (payment) {
          payment.status = 'refunded';
          await payment.save();
        }
        // Refund client wallet
        await ClientProfile.updateOne(
          { userId: contract.clientId },
          { $inc: { walletBalance: payment ? payment.depositAmount : 0 } }
        );
        contract.status = 'cancelled';
        break;
      }
      case 'split': {
        if (payment && splitPercentage) {
          const freelancerShare = round2(payment.totalAmount * (splitPercentage / 100));
          const clientRefund    = round2(payment.totalAmount - freelancerShare);
          const fee = round2(freelancerShare * (payment.feeRate || PLATFORM_FEE_RATE));
          payment.status = 'released';
          payment.platformFee = fee;
          payment.freelancerPayout = round2(freelancerShare - fee);
          payment.releasedAt = new Date();
          await payment.save();
          await FreelancerProfile.updateOne({ userId: contract.freelancerId }, { $inc: { walletBalance: payment.freelancerPayout } });
          await ClientProfile.updateOne({ userId: contract.clientId }, { $inc: { walletBalance: clientRefund } });
        }
        contract.status = 'completed';
        contract.completedAt = new Date();
        break;
      }
      case 'resume': {
        contract.status = 'active';
        break;
      }
      case 'reject': {
        // Dispute rejected — keep current state
        break;
      }
      default:
        return res.status(400).json({ success: false, message: 'Invalid resolution action' });
    }

    // Mark dispute resolved
    contract.dispute.status = 'resolved';
    contract.dispute.resolvedAt = new Date();
    contract.dispute.resolutionNotes = notes;
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
