const Job = require('../../models/Job');
const { auditLog } = require('../../utils/adminAudit');
const { exportToCSV, exportToExcel, exportToPDF, sendExportResponse } = require('../../utils/exportHelper');
const { parsePagination } = require('../../utils/helpers');

const JOB_COLUMNS = [
  { key: '_id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'type', label: 'Type' },
  { key: 'budget', label: 'Budget' },
  { key: 'createdAt', label: 'Posted' }
];

const getJobs = async (req, res) => {
  try {
    const {
      search, status, type, clientId,
      dateFrom, dateTo, budgetMin, budgetMax, showDeleted,
      sortBy = 'createdAt', order = 'desc'
    } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    // Same deleted/active toggle as the users list.
    const filter = showDeleted === 'true' ? { deletedAt: { $ne: null } } : { deletedAt: null };
    if (status) filter.status = status;
    // Job budget is embedded as { min, max, type: 'fixed'|'hourly' } — `type`
    // filters on that nested budget type; the client link is `clientId`.
    if (type) filter['budget.type'] = type;
    if (clientId) filter.clientId = clientId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
    }
    // budget is a sub-document, not a scalar — range-filter against budget.max.
    if (budgetMin || budgetMax) {
      filter['budget.max'] = {};
      if (budgetMin) filter['budget.max'].$gte = parseFloat(budgetMin);
      if (budgetMax) filter['budget.max'].$lte = parseFloat(budgetMax);
    }
    if (search) {
      filter.$or = [{ title: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate('clientId', 'email firstName lastName')
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true, jobs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('[Jobs] error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load jobs' });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('clientId', 'email firstName lastName')
      .populate('hiredFreelancer', 'email firstName lastName')
      .populate('customOfferId', 'title price deliveryDays revisions status createdAt')
      .lean();
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    return res.status(200).json({ success: true, job });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load job' });
  }
};

const editJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Every content/classification field is editable. Relational & system fields
    // (clientId, hiredFreelancer, contractId, proposals, source, gigId, gigTier,
    // statsRolledUp) are intentionally NOT editable here — those are driven by the
    // marketplace lifecycle, not free-form admin edits.
    const allowedFields = [
      'title', 'description', 'status', 'budget', 'skills', 'category',
      'subcategory', 'experienceLevel', 'duration', 'attachments', 'deadline'
    ];
    const prev = {}, next = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) {
        prev[f] = job[f]; job[f] = req.body[f]; next[f] = req.body[f];
      }
    });

    await job.save();
    auditLog(req, { action: 'job.edit', category: 'job', resource: 'Job', resourceId: job._id, previousValue: prev, newValue: next });
    return res.status(200).json({ success: true, message: 'Job updated', job });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update job' });
  }
};

const closeJob = async (req, res) => {
  try {
    const Proposal = require('../../models/Proposal');
    const job = await Job.findByIdAndUpdate(req.params.id, { status: 'closed' }, { new: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    // Same cascade the client-facing closeJob does — otherwise every
    // still-pending proposal on this job is left dangling forever, and
    // updateProposal/acceptProposal only catch it after the fact.
    await Proposal.updateMany(
      { jobId: job._id, status: 'pending' },
      { $set: { status: 'rejected', clientResponse: 'Job closed', respondedAt: new Date() } }
    );
    auditLog(req, { action: 'job.close', category: 'job', resource: 'Job', resourceId: job._id, severity: 'warning' });
    return res.status(200).json({ success: true, message: 'Job closed', job });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to close job' });
  }
};

const reopenJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    // A job with a hired freelancer/active contract is not "unfilled work
    // waiting for proposals" — reopening it would make it publicly show as
    // open for new proposals while someone is actually already working on it.
    if (job.contractId || job.hiredFreelancer || job.status === 'in-progress') {
      return res.status(400).json({ success: false, message: 'This job has a hired freelancer/active contract — it cannot be reopened for new proposals.' });
    }
    job.status = 'open';
    await job.save();
    auditLog(req, { action: 'job.reopen', category: 'job', resource: 'Job', resourceId: job._id });
    return res.status(200).json({ success: true, message: 'Job reopened', job });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to reopen job' });
  }
};

const deleteJob = async (req, res) => {
  try {
    const Proposal = require('../../models/Proposal');
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.deletedAt) return res.status(400).json({ success: false, message: 'Job already deleted' });
    if (job.status === 'in-progress') {
      return res.status(400).json({ success: false, message: 'This job has an active contract — cancel the contract (which handles any escrow) before deleting the job.' });
    }
    job.status = 'cancelled';
    job.deletedAt = new Date();
    await job.save();
    // Same cascade as close — a deleted job's pending proposals shouldn't
    // dangle either.
    await Proposal.updateMany(
      { jobId: job._id, status: 'pending' },
      { $set: { status: 'rejected', clientResponse: 'Job deleted', respondedAt: new Date() } }
    );
    auditLog(req, { action: 'job.delete', category: 'job', resource: 'Job', resourceId: job._id, severity: 'warning' });
    return res.status(200).json({ success: true, message: 'Job soft-deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete job' });
  }
};

const exportJobs = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const jobs = await Job.find().sort({ createdAt: -1 }).lean();
    const buf = format === 'excel' ? await exportToExcel(jobs, JOB_COLUMNS, 'Jobs')
              : format === 'pdf'   ? await exportToPDF(jobs, JOB_COLUMNS, 'Jobs Export')
              : exportToCSV(jobs, JOB_COLUMNS);
    auditLog(req, { action: `export.${format}`, category: 'export', resource: 'Job', notes: `${jobs.length} jobs` });
    sendExportResponse(res, buf, format, 'jobs');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Export failed' });
  }
};

module.exports = { getJobs, getJobById, editJob, closeJob, reopenJob, deleteJob, exportJobs };
