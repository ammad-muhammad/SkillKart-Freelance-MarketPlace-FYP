const Job = require('../models/Job');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');
const { uploadJobAttachment: uploadJobAttachmentToCloud } = require('../services/upload.service');
const { recommendJobCategory } = require('../services/jobCategory.service');

/**
 * Sync job statuses based on deadlines
 */
const syncJobStatuses = async (query = {}) => {
  const now = new Date();
  // Find open jobs where deadline has passed
  await Job.updateMany(
    { 
      ...query,
      status: 'open', 
      deadline: { $lt: now } 
    },
    { $set: { status: 'expired' } }
  );
};

/**
 * Create job
 */
const createJob = asyncHandler(async (req, res) => {
  const jobData = req.body;
  const clientId = req.user._id;
  
  const allowedStatuses = ['draft', 'open'];
  const status = allowedStatuses.includes(jobData.status) ? jobData.status : 'open';

  const job = new Job({
    ...jobData,
    clientId,
    status
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
  
  await syncJobStatuses({ _id: id });
  
  const job = await Job.findById(id)
    .populate('clientId', 'firstName lastName email profilePicture')
    .populate('hiredFreelancer', 'firstName lastName email profilePicture')
    .populate({
      path: 'proposals',
      populate: { path: 'freelancerId', select: 'firstName lastName profilePicture' }
    });
  
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
  const { status, category, skills, experienceLevel, budgetType, clientId } = req.query;
  
  await syncJobStatuses(clientId ? { clientId } : {});
  
  const query = { status: 'open' }; // Strictly only open jobs for public
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
 * List client's own projects
 */
const getMyProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const clientId = req.user._id;

  await syncJobStatuses({ clientId });

  const query = { clientId };
  const total = await Job.countDocuments(query);
  const jobs = await Job.find(query)
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
  
  job.status = job.hiredFreelancer ? 'completed' : 'closed';
  await job.save();

  sendSuccess(res, {
    message: 'Job closed successfully',
    data: { job }
  });
});

const recommendCategory = asyncHandler(async (req, res) => {
  const { title, description, skills } = req.body;
  const result = await recommendJobCategory(title, description, skills);

  sendSuccess(res, {
    message: 'Category recommendation generated',
    data: result
  });
});

const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const uploaded = await uploadJobAttachmentToCloud(req.file);

  sendSuccess(res, {
    message: 'Attachment uploaded successfully',
    data: uploaded
  });
});

module.exports = {
  createJob,
  updateJob,
  getJobById,
  listJobs,
  searchJobs,
  deleteJob,
  closeJob,
  uploadAttachment,
  recommendCategory,
  getMyProjects
};
