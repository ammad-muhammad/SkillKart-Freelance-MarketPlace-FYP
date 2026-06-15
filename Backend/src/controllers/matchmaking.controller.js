const Job = require('../models/Job');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError, BadRequestError } = require('../utils/apiError');
const { matchFreelancers } = require('../services/matchmaking.service');

const buildBrief = ({ title, description, skills, budget, timeline, category }) => ({
  title: title || '',
  description: description || '',
  category: category || '',
  timeline: timeline || '',
  budget: Number(budget) || 0,
  skills: Array.isArray(skills)
    ? skills
    : (typeof skills === 'string' && skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : []),
});

/**
 * POST /matchmaking
 * Body: { title, description, skills, budget, timeline, category }
 * Returns AI-ranked freelancers for the supplied project brief.
 */
const matchByProject = asyncHandler(async (req, res) => {
  const brief = buildBrief(req.body || {});

  if (!brief.title.trim() && !brief.description.trim() && brief.skills.length === 0) {
    throw new BadRequestError('Provide at least a project title, description, or some required skills');
  }

  const { matches, analysed } = await matchFreelancers(brief, { limit: 8 });

  sendSuccess(res, {
    message: 'Matches generated successfully',
    data: { matches, analysed },
  });
});

/**
 * GET /matchmaking?projectId=...
 * Ranks freelancers against an already-saved project (job).
 */
const matchById = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) {
    throw new BadRequestError('projectId query parameter is required');
  }

  const job = await Job.findById(projectId);
  if (!job) {
    throw new NotFoundError('Project not found');
  }

  const brief = buildBrief({
    title: job.title,
    description: job.description,
    skills: job.skills,
    budget: job.budget?.max || job.budget?.min,
    category: job.category,
    timeline: job.duration,
  });

  const { matches, analysed } = await matchFreelancers(brief, { limit: 8 });

  sendSuccess(res, {
    message: 'Matches generated successfully',
    data: { matches, analysed, project: { id: String(job._id), title: job.title } },
  });
});

module.exports = { matchByProject, matchById };
