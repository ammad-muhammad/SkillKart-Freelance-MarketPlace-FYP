const Contract = require('../../models/Contract');
const ContractHistory = require('../../models/ContractHistory');
const Payment = require('../../models/Payment');
const TimeLog = require('../../models/TimeLog');
const { auditLog } = require('../../utils/adminAudit');
const notifications = require('../../services/notification.service');
const { exportToCSV, exportToExcel, exportToPDF, sendExportResponse } = require('../../utils/exportHelper');
const { parsePagination } = require('../../utils/helpers');
const { round2 } = require('../../utils/constants');

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
      dateFrom, dateTo, sortBy = 'createdAt', order = 'desc'
    } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

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

    const [contracts, total] = await Promise.all([
      Contract.find(filter)
        .populate('clientId', 'email firstName lastName')
        .populate('freelancerId', 'email firstName lastName')
        .populate('jobId', 'title')
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contract.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true, contracts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
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
    // A fixed-price contract can have one Payment per milestone, and an hourly
    // contract one per lock/top-up/invoice — never assume a single result.
    const [history, timeLogs, payments, deliveries] = await Promise.all([
      ContractHistory.find({ contractId: contract._id })
        .populate('performedBy', 'email firstName lastName')
        .sort({ createdAt: -1 }).lean(),
      TimeLog.find({ contractId: contract._id }).sort({ startTime: -1 }).lean(),
      Payment.find({ contractId: contract._id }).sort({ createdAt: 1 }).lean(),
      Delivery.find({ contractId: contract._id }).sort({ version: -1 }).lean()
    ]);

    return res.status(200).json({ success: true, contract, history, timeLogs, payments, deliveries });
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

/**
 * POST /contracts/:id/cancel — call off the contract and refund any
 * outstanding escrow to the CLIENT (the mirror image of force-complete,
 * which pays outstanding escrow to the freelancer). Never just flips
 * `status` — that used to leave funded milestones / a locked hourly
 * balance stranded forever, with no code path ever revisiting a
 * cancelled contract to settle them, and left the Job showing
 * 'in-progress' for a contract that was actually dead.
 */
const cancelContract = async (req, res) => {
  try {
    const Job = require('../../models/Job');
    const Milestone = require('../../models/Milestone');
    const ClientProfile = require('../../models/ClientProfile');
    const { drawDownForTimeLog, refundRemainingHourlyEscrow } = require('../../services/hourlyEscrow.service');

    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    if (['completed', 'cancelled'].includes(contract.status)) {
      return res.status(400).json({ success: false, message: `Contract is already ${contract.status}` });
    }

    const job = contract.jobId ? await Job.findById(contract.jobId) : null;
    let refunded = 0; // gross amount refunded to the client, for the admin-facing response

    if (contract.type === 'fixed') {
      const disputedCount = await Milestone.countDocuments({ contractId: contract._id, status: 'disputed' });
      if (disputedCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'This contract has an unresolved milestone dispute — resolve it via the Disputes page before cancelling.'
        });
      }

      // Any milestone still holding escrow (funded, or delivered but not yet
      // approved) gets refunded to the client rather than paid out — cancel
      // means the deal is off, not that undelivered/unapproved work is good.
      const milestones = await Milestone.find({
        contractId: contract._id,
        status: { $in: ['funded', 'submitted', 'in_revision'] }
      }).sort({ order: 1 });
      for (const milestone of milestones) {
        const payment = await Payment.findOne({ milestoneId: milestone._id, type: 'job_escrow' });
        if (payment && payment.status !== 'refunded') {
          payment.status = 'refunded';
          await payment.save();
          await ClientProfile.updateOne({ userId: contract.clientId }, { $inc: { walletBalance: payment.totalAmount } });
          refunded += payment.totalAmount;
        }
        milestone.status = 'refunded';
        await milestone.save();
      }
      // Milestones never reached (still at their default, never funded) —
      // nothing to refund, just close them out so none dangle under a
      // cancelled contract.
      await Milestone.updateMany(
        { contractId: contract._id, status: 'pending_funding' },
        { $set: { status: 'cancelled' } }
      );
    } else {
      // Hourly: work already logged is real, verifiable work — settle it
      // the same way force-complete does — then refund whatever's left of
      // the lock. Cancelling doesn't erase hours already performed.
      const pendingLogs = await TimeLog.find({ contractId: contract._id, status: 'pending' }).sort({ startTime: 1 });
      for (const log of pendingLogs) {
        try {
          await drawDownForTimeLog({ timeLog: log, contract, job });
        } catch (err) {
          console.error(`[Contracts] cancelContract: could not settle time log ${log._id}: ${err.message}`);
          break;
        }
      }
      refunded = await refundRemainingHourlyEscrow({ contract, job });
    }

    const prev = contract.status;
    contract.status = 'cancelled';
    contract.completedAt = contract.completedAt || null;
    await contract.save();

    if (job && !['completed', 'cancelled'].includes(job.status)) {
      job.status = 'cancelled';
      await job.save();
    }

    // Neither party has any other way to find out — an admin cancel doesn't
    // go through either of the freelancer/client-initiated flows (which
    // already notify via onContractDisputed/onContractStatusChanged), so
    // both sides need telling directly here.
    notifications.onJobCancelled(contract.clientId, { job });
    notifications.onJobCancelled(contract.freelancerId, { job });

    recordHistory(contract._id, 'cancel', `[Admin] Contract cancelled. Refunded Rs. ${refunded} to client. ${req.body.reason || ''}`.trim(), req.admin.email, { status: prev }, { status: 'cancelled', refunded });
    auditLog(req, {
      action: 'contract.cancel', category: 'contract', resource: 'Contract',
      resourceId: contract._id, previousValue: { status: prev }, newValue: { status: 'cancelled', refunded },
      notes: req.body.reason, severity: 'critical'
    });
    return res.status(200).json({ success: true, message: `Contract cancelled. Rs. ${refunded} refunded to client.`, contract, refunded });
  } catch (err) {
    console.error('[Contracts] cancelContract error:', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel contract' });
  }
};

/**
 * POST /contracts/:id/force-complete — mark completed and release any
 * outstanding escrow to the freelancer (internal ledger).
 *
 * Reuses the exact same money-movement functions as the normal completion
 * paths (milestone.service.js's releaseMilestone / hourlyEscrow.service.js's
 * drawDownForTimeLog+refundRemainingHourlyEscrow) — never re-implements
 * escrow release inline, and never assumes a single Payment row: a
 * fixed-price contract can have one funded milestone per Payment, so every
 * non-terminal milestone is released, not just whichever Payment happened to
 * be found first.
 */
const forceComplete = async (req, res) => {
  try {
    const Job = require('../../models/Job');
    const Milestone = require('../../models/Milestone');
    const { releaseMilestone } = require('../../services/milestone.service');
    const { drawDownForTimeLog, refundRemainingHourlyEscrow } = require('../../services/hourlyEscrow.service');
    const { finalizeJobCompletion } = require('../../services/jobCompletion.service');

    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    if (contract.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Contract is already completed' });
    }

    const job = contract.jobId ? await Job.findById(contract.jobId) : null;
    let released = 0;   // net amount paid out to the freelancer, for the admin-facing response
    let clientSpend = 0; // gross amount to roll up into ClientProfile.totalSpent
    let strandedHourlyAmount = 0; // logged hours the lock couldn't cover — surfaced, not silently dropped

    if (contract.type === 'fixed') {
      const disputedCount = await Milestone.countDocuments({ contractId: contract._id, status: 'disputed' });
      if (disputedCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'This contract has an unresolved milestone dispute — resolve it via the Disputes page before force-completing.'
        });
      }

      const milestones = await Milestone.find({
        contractId: contract._id,
        status: { $in: ['funded', 'submitted', 'in_revision'] }
      }).sort({ order: 1 });
      for (const milestone of milestones) {
        const { payment, freelancerPayout } = await releaseMilestone({ milestone, contract, job });
        released += freelancerPayout;
        clientSpend += payment.totalAmount;
      }
    } else {
      const pendingLogs = await TimeLog.find({ contractId: contract._id, status: 'pending' }).sort({ startTime: 1 });
      for (const log of pendingLogs) {
        try {
          const { amount } = await drawDownForTimeLog({ timeLog: log, contract, job });
          released += amount;
          clientSpend += amount;
        } catch (err) {
          console.error(`[Contracts] forceComplete: could not settle time log ${log._id}: ${err.message}`);
          break;
        }
      }
      // Unlike the client-facing end-contract paths (which now block ending
      // entirely if the lock can't cover every pending log), force-complete
      // is a deliberate admin override — it's allowed to proceed regardless,
      // but must not do so SILENTLY: any hours the lock couldn't cover are
      // reported back so the admin can compensate the freelancer manually
      // (e.g. a wallet adjustment) if warranted, rather than that money
      // just vanishing with no record anyone was ever short.
      const stillPending = await TimeLog.find({ contractId: contract._id, status: 'pending' }).select('duration').lean();
      const strandedMs = stillPending.reduce((sum, log) => sum + (log.duration || 0), 0);
      strandedHourlyAmount = round2((strandedMs / 3600000) * (contract.hourlyRate || 0));
      if (strandedHourlyAmount > 0) {
        console.warn(`[Contracts] forceComplete: Rs. ${strandedHourlyAmount} of logged hours could not be settled (escrow exhausted) on contract ${contract._id}`);
      }
      await refundRemainingHourlyEscrow({ contract, job });
    }

    const prev = contract.status;
    contract.status = 'completed';
    contract.completedAt = new Date();
    await contract.save();

    if (job && job.status !== 'completed') {
      job.status = 'completed';
      job.completedAt = new Date();
      // skipEarningsCredit: true — releaseMilestone/drawDownForTimeLog already
      // credited the freelancer's wallet/totalEarnings above.
      await finalizeJobCompletion(job, { clientSpend, skipEarningsCredit: true });
    }

    const strandedNote = strandedHourlyAmount > 0
      ? ` WARNING: Rs. ${strandedHourlyAmount} of logged hours could not be settled (escrow exhausted) — freelancer may need manual compensation.`
      : '';
    recordHistory(contract._id, 'admin_force_complete', `[Admin] Force-completed. Released ${released} to freelancer. ${req.body.reason || ''}`.trim() + strandedNote, req.admin.email, { status: prev }, { status: 'completed', released, strandedHourlyAmount });
    auditLog(req, {
      action: 'contract.force_complete', category: 'contract', resource: 'Contract',
      resourceId: contract._id, previousValue: { status: prev }, newValue: { status: 'completed', released, strandedHourlyAmount },
      notes: req.body.reason, severity: 'critical'
    });
    return res.status(200).json({
      success: true,
      message: strandedHourlyAmount > 0
        ? `Contract force-completed. Rs. ${strandedHourlyAmount} of logged hours could not be settled (escrow exhausted) — consider a manual wallet adjustment for the freelancer.`
        : 'Contract force-completed',
      released,
      strandedHourlyAmount
    });
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
