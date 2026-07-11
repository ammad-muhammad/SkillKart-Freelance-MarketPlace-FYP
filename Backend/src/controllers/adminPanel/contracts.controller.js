const Contract = require('../../models/Contract');
const ContractHistory = require('../../models/ContractHistory');
const Payment = require('../../models/Payment');
const TimeLog = require('../../models/TimeLog');
const { auditLog } = require('../../utils/adminAudit');
const { exportToCSV, exportToExcel, exportToPDF, sendExportResponse } = require('../../utils/exportHelper');
const { PLATFORM_FEE_RATE, round2 } = require('../../utils/constants');

const CONTRACT_COLUMNS = [
  { key: '_id', label: 'ID' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'fixedPrice', label: 'Price' },
  { key: 'startedAt', label: 'Started' },
  { key: 'completedAt', label: 'Completed' }
];

const getContracts = async (req, res) => {
  try {
    const {
      search, status, type, clientId, freelancerId,
      dateFrom, dateTo, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (clientId) filter.clientId = clientId;
    if (freelancerId) filter.freelancerId = freelancerId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [contracts, total] = await Promise.all([
      Contract.find(filter)
        .populate('clientId', 'email firstName lastName')
        .populate('freelancerId', 'email firstName lastName')
        .populate('jobId', 'title')
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Contract.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true, contracts,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load contracts' });
  }
};

const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('clientId', 'email firstName lastName')
      .populate('freelancerId', 'email firstName lastName')
      .populate('jobId', 'title budget')
      .lean();

    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const Delivery = require('../../models/Delivery');
    const [history, timeLogs, payment, deliveries] = await Promise.all([
      ContractHistory.find({ contractId: contract._id })
        .populate('performedBy', 'email firstName lastName')
        .sort({ createdAt: -1 }).lean(),
      TimeLog.find({ contractId: contract._id }).sort({ startedAt: -1 }).lean(),
      Payment.findOne({ contractId: contract._id }).lean(),
      Delivery.find({ contractId: contract._id }).sort({ version: -1 }).lean()
    ]);

    return res.status(200).json({ success: true, contract, history, timeLogs, payment, deliveries });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load contract' });
  }
};

const addContractNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ success: false, message: 'Note is required' });

    await ContractHistory.create({
      contractId: req.params.id,
      action: 'admin_note',
      notes: `[Admin Note] ${note}`,
      performedByAdmin: req.admin.email
    });

    auditLog(req, {
      action: 'contract.note.added',
      category: 'contract',
      resource: 'Contract',
      resourceId: req.params.id,
      newValue: { note },
      severity: 'info'
    });

    return res.status(200).json({ success: true, message: 'Note added' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add note' });
  }
};

// ─── Contract lifecycle control (admin) ─────────────────────────────────────────
// Record a history entry + audit log for every admin-initiated contract change.
const recordHistory = (contractId, action, notes, adminEmail, previousValue, newValue) =>
  ContractHistory.create({ contractId, action, notes, performedByAdmin: adminEmail, previousValue, newValue })
    .catch(err => console.error('[Contracts] history write failed:', err.message));

/**
 * PATCH /contracts/:id — edit mutable contract fields.
 * Parties (client/freelancer), type, jobId, proposalId, timer and dispute are
 * immutable here — those are driven by the lifecycle / dedicated actions.
 */
const editContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const allowed = [
      'fixedPrice', 'hourlyRate', 'weeklyLimit', 'agreedDeadline',
      'status', 'revisionNote', 'startedAt', 'completedAt'
    ];
    const prev = {}, next = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) {
        prev[f] = contract[f];
        contract[f] = req.body[f];
        next[f] = req.body[f];
      }
    });
    if (Object.keys(next).length === 0) {
      return res.status(400).json({ success: false, message: 'No editable fields provided' });
    }

    await contract.save();
    recordHistory(contract._id, 'admin_edit', '[Admin] Contract terms edited', req.admin.email, prev, next);
    auditLog(req, {
      action: 'contract.edit', category: 'contract', resource: 'Contract',
      resourceId: contract._id, previousValue: prev, newValue: next, severity: 'warning'
    });
    return res.status(200).json({ success: true, message: 'Contract updated', contract });
  } catch (err) {
    console.error('[Contracts] edit error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update contract' });
  }
};

// Shared status-transition helper for pause/resume/cancel.
const transition = (newStatus, actionName, severity = 'warning') => async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const prev = contract.status;
    contract.status = newStatus;
    if (newStatus === 'cancelled') contract.completedAt = contract.completedAt || null;
    await contract.save();

    recordHistory(contract._id, actionName, `[Admin] Contract ${newStatus}. ${req.body.reason || ''}`.trim(), req.admin.email, { status: prev }, { status: newStatus });
    auditLog(req, {
      action: `contract.${actionName}`, category: 'contract', resource: 'Contract',
      resourceId: contract._id, previousValue: { status: prev }, newValue: { status: newStatus },
      notes: req.body.reason, severity
    });
    return res.status(200).json({ success: true, message: `Contract ${newStatus}`, contract });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to ${actionName} contract` });
  }
};

const pauseContract  = transition('paused', 'pause');
const resumeContract = transition('active', 'resume', 'info');
const cancelContract = transition('cancelled', 'cancel', 'critical');

/**
 * POST /contracts/:id/force-complete — mark completed and release escrow to the
 * freelancer (internal ledger). Idempotent on an already-released payment.
 */
const forceComplete = async (req, res) => {
  try {
    const FreelancerProfile = require('../../models/FreelancerProfile');
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const payment = await Payment.findOne({ contractId: contract._id });
    let released = 0;
    if (payment && payment.status !== 'released' && payment.status !== 'refunded') {
      const fee = round2(payment.totalAmount * (payment.feeRate || PLATFORM_FEE_RATE));
      payment.platformFee = fee;
      payment.freelancerPayout = round2(payment.totalAmount - fee);
      payment.status = 'released';
      payment.releasedAt = new Date();
      await payment.save();
      released = payment.freelancerPayout;
      await FreelancerProfile.updateOne(
        { userId: contract.freelancerId },
        { $inc: { walletBalance: released, totalEarnings: released } }
      );
    }

    const prev = contract.status;
    contract.status = 'completed';
    contract.completedAt = new Date();
    await contract.save();

    recordHistory(contract._id, 'admin_force_complete', `[Admin] Force-completed. Released ${released} to freelancer. ${req.body.reason || ''}`.trim(), req.admin.email, { status: prev }, { status: 'completed', released });
    auditLog(req, {
      action: 'contract.force_complete', category: 'contract', resource: 'Contract',
      resourceId: contract._id, previousValue: { status: prev }, newValue: { status: 'completed', released },
      notes: req.body.reason, severity: 'critical'
    });
    return res.status(200).json({ success: true, message: 'Contract force-completed', released });
  } catch (err) {
    console.error('[Contracts] forceComplete error:', err);
    return res.status(500).json({ success: false, message: 'Failed to force-complete contract' });
  }
};

/**
 * POST /contracts/:id/reassign — move the contract to a different freelancer.
 * Body: { freelancerId }. Updates the linked job's hiredFreelancer too.
 */
const reassignContract = async (req, res) => {
  try {
    const Job = require('../../models/Job');
    const User = require('../../models/User');
    const { freelancerId } = req.body;
    if (!freelancerId) return res.status(400).json({ success: false, message: 'freelancerId is required' });

    const freelancer = await User.findById(freelancerId);
    if (!freelancer || freelancer.role !== 'freelancer') {
      return res.status(400).json({ success: false, message: 'Target must be a valid freelancer' });
    }

    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const prev = contract.freelancerId;
    contract.freelancerId = freelancerId;
    await contract.save();

    if (contract.jobId) {
      await Job.updateOne({ _id: contract.jobId }, { hiredFreelancer: freelancerId });
    }
    await Payment.updateMany({ contractId: contract._id, status: { $ne: 'released' } }, { freelancerId });

    recordHistory(contract._id, 'admin_reassign', `[Admin] Reassigned to ${freelancer.email}. ${req.body.reason || ''}`.trim(), req.admin.email, { freelancerId: prev }, { freelancerId });
    auditLog(req, {
      action: 'contract.reassign', category: 'contract', resource: 'Contract',
      resourceId: contract._id, previousValue: { freelancerId: prev }, newValue: { freelancerId },
      notes: req.body.reason, severity: 'critical'
    });
    return res.status(200).json({ success: true, message: 'Contract reassigned' });
  } catch (err) {
    console.error('[Contracts] reassign error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reassign contract' });
  }
};

const exportContracts = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const contracts = await Contract.find().sort({ createdAt: -1 }).lean();
    const buf = format === 'excel' ? await exportToExcel(contracts, CONTRACT_COLUMNS, 'Contracts')
              : format === 'pdf'   ? await exportToPDF(contracts, CONTRACT_COLUMNS, 'Contracts Export')
              : exportToCSV(contracts, CONTRACT_COLUMNS);
    auditLog(req, { action: `export.${format}`, category: 'export', resource: 'Contract', notes: `${contracts.length} contracts` });
    sendExportResponse(res, buf, format, 'contracts');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Export failed' });
  }
};

module.exports = {
  getContracts, getContractById, addContractNote, exportContracts,
  editContract, pauseContract, resumeContract, cancelContract,
  forceComplete, reassignContract
};
