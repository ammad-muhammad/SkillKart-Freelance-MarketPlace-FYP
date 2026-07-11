const Job = require('../../models/Job');
const { auditLog } = require('../../utils/adminAudit');
const { exportToCSV, exportToExcel, exportToPDF, sendExportResponse } = require('../../utils/exportHelper');

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
      dateFrom, dateTo, budgetMin, budgetMax,
      page = 1, limit = 20, sortBy = 'createdAt', order = 'desc'
    } = req.query;

    const filter = {};
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate('clientId', 'email firstName lastName')
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Job.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true, jobs,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
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
    const job = await Job.findByIdAndUpdate(req.params.id, { status: 'closed' }, { new: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    auditLog(req, { action: 'job.close', category: 'job', resource: 'Job', resourceId: job._id, severity: 'warning' });
    return res.status(200).json({ success: true, message: 'Job closed', job });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to close job' });
  }
};

const reopenJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, { status: 'open' }, { new: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    auditLog(req, { action: 'job.reopen', category: 'job', resource: 'Job', resourceId: job._id });
    return res.status(200).json({ success: true, message: 'Job reopened', job });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to reopen job' });
  }
};

const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    job.status = 'cancelled';
    job.deletedAt = new Date();
    await job.save();
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
