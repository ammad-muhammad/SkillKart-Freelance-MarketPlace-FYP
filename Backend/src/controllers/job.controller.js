const Job = require('../models/Job');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');

/**
 * Create job
 */
const createJob = asyncHandler(async (req, res) => {
  const jobData = req.body;
  const clientId = req.user._id;
  
  const job = new Job({
    ...jobData,
    clientId,
    status: 'draft'
  });
  
  await job.save();
  
  sendCreated(res, 'Job created successfully', { job });
});

/**
 * Update job
 */
const updateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const job = await Job.findById(id);
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  
  Object.assign(job, updates);
  await job.save();
  
  sendSuccess(res, {
    message: 'Job updated successfully',
    data: { job }
  });
});

/**
 * Get job by ID
 */
const getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const job = await Job.findById(id)
    .populate('clientId', 'firstName lastName email profilePicture')
    .populate('hiredFreelancer', 'firstName lastName email profilePicture');
  
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  
  sendSuccess(res, {
    message: 'Job retrieved successfully',
    data: { job }
  });
});

/**
 * List jobs
 */
const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, category, skills, experienceLevel, budgetType } = req.query;
  
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (experienceLevel) query.experienceLevel = experienceLevel;
  if (budgetType) query['budget.type'] = budgetType;
  if (skills) {
    const skillsArray = skills.split(',').map(s => s.trim());
    query.skills = { $in: skillsArray };
  }
  
  const total = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .populate('clientId', 'firstName lastName profilePicture')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  
  sendPaginated(res, { data: jobs, page, limit, total });
});

/**
 * Search jobs
 */
const searchJobs = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  
  const query = {
    status: 'open',
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { skills: { $in: [new RegExp(q, 'i')] } }
    ]
  };
  
  const total = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .populate('clientId', 'firstName lastName profilePicture')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });
  
  sendPaginated(res, { data: jobs, page: parseInt(page), limit: parseInt(limit), total });
});

/**
 * Delete job
 */
const deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const job = await Job.findById(id);
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  
  await Job.deleteOne({ _id: id });
  
  sendSuccess(res, {
    message: 'Job deleted successfully'
  });
});

/**
 * Close job
 */
const closeJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const job = await Job.findById(id);
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  
  job.status = 'closed';
  await job.save();
  
  sendSuccess(res, {
    message: 'Job closed successfully',
    data: { job }
  });
});

module.exports = {
  createJob,
  updateJob,
  getJobById,
  listJobs,
  searchJobs,
  deleteJob,
  closeJob
};
