const Job = require('../models/Job');
const ClientProfile = require('../models/ClientProfile');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create job (client only)
 * POST /api/jobs
 */
const createJob = asyncHandler(async (req, res) => {
  const job = await Job.create({
    clientId: req.user._id,
    ...req.body,
  });

  // Update client stats
  await ClientProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $inc: { totalJobsPosted: 1 } }
  );

  res.status(201).json(
    new ApiResponse(201, job, 'Job created successfully')
  );
});

/**
 * Get all jobs (with filters)
 * GET /api/jobs
 */
const getJobs = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    category,
    skills,
    budgetType,
    minBudget,
    maxBudget,
    experienceLevel,
    search,
    sort,
  } = req.query;

  const query = { status: 'active' };

  // Apply filters
  if (category) query.category = category;
  if (experienceLevel) query.experienceLevel = experienceLevel;
  if (budgetType) query['budget.type'] = budgetType;

  if (skills) {
    const skillsArray = skills.split(',');
    query.skills = { $in: skillsArray };
  }

  if (minBudget || maxBudget) {
    query['budget.min'] = {};
    if (minBudget) query['budget.min'].$gte = Number(minBudget);
    if (maxBudget) query['budget.max'].$lte = Number(maxBudget);
  }

  if (search) {
    query.$text = { $search: search };
  }

  // Sort
  let sortOption = { postedAt: -1 };
  if (sort === 'oldest') sortOption = { postedAt: 1 };
  if (sort === 'budget-high') sortOption = { 'budget.max': -1 };
  if (sort === 'budget-low') sortOption = { 'budget.min': 1 };

  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('clientId', 'email')
      .lean(),
    Job.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      jobs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    }, 'Jobs retrieved successfully')
  );
});

/**
 * Get job by ID
 * GET /api/jobs/:id
 */
const getJobById = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
    .populate('clientId', 'email')
    .populate({
      path: 'clientId',
      populate: {
        path: 'profile',
        model: 'ClientProfile',
      },
    });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  // Increment views (don't count client's own views)
  if (!req.user || req.user._id.toString() !== job.clientId._id.toString()) {
    job.views += 1;
    await job.save();
  }

  res.status(200).json(
    new ApiResponse(200, job, 'Job retrieved successfully')
  );
});

/**
 * Update job (client only)
 * PUT /api/jobs/:id
 */
const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.id,
    clientId: req.user._id,
  });

  if (!job) {
    throw new ApiError(404, 'Job not found or unauthorized');
  }

  Object.assign(job, req.body);
  await job.save();

  res.status(200).json(
    new ApiResponse(200, job, 'Job updated successfully')
  );
});

/**
 * Delete job (client only)
 * DELETE /api/jobs/:id
 */
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.id,
    clientId: req.user._id,
  });

  if (!job) {
    throw new ApiError(404, 'Job not found or unauthorized');
  }

  job.status = 'cancelled';
  await job.save();

  res.status(200).json(
    new ApiResponse(200, null, 'Job cancelled successfully')
  );
});

/**
 * Get my posted jobs (client only)
 * GET /api/jobs/my/posted
 */
const getMyJobs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { clientId: req.user._id };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Job.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      jobs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    }, 'Jobs retrieved successfully')
  );
});

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  getMyJobs,
};
