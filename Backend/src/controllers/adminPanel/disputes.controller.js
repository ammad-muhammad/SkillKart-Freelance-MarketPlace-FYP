const Contract = require('../../models/Contract');
const Payment = require('../../models/Payment');
const FreelancerProfile = require('../../models/FreelancerProfile');
const ClientProfile = require('../../models/ClientProfile');
const ContractHistory = require('../../models/ContractHistory');
const { auditLog } = require('../../utils/adminAudit');

const getDisputes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { 'dispute.status': { $exists: true } };
    if (status) filter['dispute.status'] = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [disputes, total] = await Promise.all([
      Contract.find(filter)
        .populate('clientId', 'email firstName lastName')
        .populate('freelancerId', 'email firstName lastName')
        .populate('jobId', 'title')
        .sort({ 'dispute.raisedAt': -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Contract.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true, disputes,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
};

const getDisputeById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.contractId)
      .populate('clientId', 'email firstName lastName profilePicture')
      .populate('freelancerId', 'email firstName lastName profilePicture')
      .populate('jobId', 'title budget')
      .lean();

    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const [history, payment] = await Promise.all([
      ContractHistory.find({ contractId: contract._id }).sort({ createdAt: -1 }).lean(),
      Payment.findOne({ contractId: contract._id }).lean()
    ]);

    return res.status(200).json({ success: true, contract, history, payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load dispute' });
  }
};

const resolveDispute = async (req, res) => {
  try {
    const { action, notes, splitPercentage } = req.body;
    const { contractId } = req.params;

    const contract = await Contract.findById(contractId);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    if (!contract.dispute || contract.dispute.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No active dispute on this contract' });
    }

    const payment = await Payment.findOne({ contractId });

    // Apply resolution action
    switch (action) {
      case 'release_freelancer': {
        // Release full escrow to freelancer
        if (payment) {
          const fee = payment.totalAmount * (payment.feeRate || 0.005);
          payment.platformFee = fee;
          payment.freelancerPayout = payment.totalAmount - fee;
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
          const freelancerShare = payment.totalAmount * (splitPercentage / 100);
          const clientRefund    = payment.totalAmount - freelancerShare;
          const fee = freelancerShare * (payment.feeRate || 0.005);
          payment.status = 'released';
          payment.platformFee = fee;
          payment.freelancerPayout = freelancerShare - fee;
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
      description: `[Admin] Dispute resolved via "${action}". Notes: ${notes}`,
      performedBy: req.admin.email
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
