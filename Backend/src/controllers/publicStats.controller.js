const Gig = require('../models/Gig');
const Job = require('../models/Job');
const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');
const ContactMessage = require('../models/ContactMessage');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { BadRequestError } = require('../utils/apiError');
const { JOB_CATEGORIES } = require('../utils/constants');

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Lightweight icon/gradient hints per category so the UI can render nicely
// without a separate static file. Falls back to a default.
const CATEGORY_META = {
  'Web Development': { icon: '🌐', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  'Mobile Development': { icon: '📱', gradient: 'linear-gradient(135deg,#0ea5e9,#22d3ee)' },
  'UI/UX Design': { icon: '🎨', gradient: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
  'Data Science & AI': { icon: '🤖', gradient: 'linear-gradient(135deg,#10b981,#34d399)' },
  'Content & Writing': { icon: '✍️', gradient: 'linear-gradient(135deg,#f59e0b,#f97316)' },
  'Video & Animation': { icon: '🎬', gradient: 'linear-gradient(135deg,#8b5cf6,#6366f1)' },
  'Digital Marketing': { icon: '📈', gradient: 'linear-gradient(135deg,#3b82f6,#6366f1)' },
  'Cybersecurity': { icon: '🛡️', gradient: 'linear-gradient(135deg,#ef4444,#f43f5e)' },
  'DevOps & Cloud': { icon: '☁️', gradient: 'linear-gradient(135deg,#06b6d4,#0ea5e9)' },
  'Other': { icon: '✨', gradient: 'linear-gradient(135deg,#64748b,#94a3b8)' },
};

/**
 * GET /public/stats — real platform-wide metrics for marketing counters.
 */
const getStats = asyncHandler(async (req, res) => {
  const [freelancers, clients, activeGigs, openJobs, completedJobs, cancelledJobs, ratingAgg] = await Promise.all([
    User.countDocuments({ role: 'freelancer', isActive: true }),
    User.countDocuments({ role: 'client', isActive: true }),
    Gig.countDocuments({ status: 'active' }),
    Job.countDocuments({ status: 'open' }),
    Job.countDocuments({ status: 'completed' }),
    Job.countDocuments({ status: 'cancelled' }),
    // Average rating across rated gigs (real "avg rating" signal).
    Gig.aggregate([
      { $match: { status: 'active', 'stats.rating': { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$stats.rating' } } },
    ]),
  ]);

  const finishedJobs = completedJobs + cancelledJobs;
  // Real success rate = completed / (completed + cancelled). 0 jobs → null.
  const successRate = finishedJobs > 0 ? Math.round((completedJobs / finishedJobs) * 100) : null;
  const avgRating = ratingAgg[0]?.avg ? Number(ratingAgg[0].avg.toFixed(1)) : null;

  sendSuccess(res, {
    message: 'Platform stats',
    data: {
      freelancers,
      clients,
      totalUsers: freelancers + clients,
      activeGigs,
      openJobs,
      completedJobs,
      cancelledJobs,
      successRate,   // null until there are finished jobs
      avgRating,     // null until there are rated gigs
      categories: JOB_CATEGORIES.length,
    },
  });
});

/**
 * GET /public/categories — canonical categories with REAL active-gig counts.
 */
const getCategories = asyncHandler(async (req, res) => {
  const counts = await Gig.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id, c.count]));

  const categories = JOB_CATEGORIES.map((name) => ({
    name,
    slug: slugify(name),
    icon: (CATEGORY_META[name] || CATEGORY_META.Other).icon,
    gradient: (CATEGORY_META[name] || CATEGORY_META.Other).gradient,
    totalServices: countMap.get(name) || 0,
  }));

  sendSuccess(res, { message: 'Categories', data: { categories } });
});

/**
 * GET /public/categories/:slug/stats — real aggregates for one category.
 */
const getCategoryStats = asyncHandler(async (req, res) => {
  const name = JOB_CATEGORIES.find((c) => slugify(c) === req.params.slug);
  if (!name) return sendSuccess(res, { message: 'Category stats', data: null });

  const [agg] = await Gig.aggregate([
    { $match: { category: name, status: 'active' } },
    {
      $group: {
        _id: null,
        totalGigs: { $sum: 1 },
        freelancers: { $addToSet: '$freelancerId' },
        avgRating: { $avg: '$stats.rating' },
        minPrice: { $min: '$pricing.basic.price' },
      },
    },
  ]);

  sendSuccess(res, {
    message: 'Category stats',
    data: {
      name,
      slug: req.params.slug,
      totalGigs: agg?.totalGigs || 0,
      totalFreelancers: agg?.freelancers?.length || 0,
      avgRating: agg?.avgRating ? Number(agg.avgRating.toFixed(1)) : 0,
      startingPrice: agg?.minPrice || 0,
    },
  });
});

/**
 * GET /public/skills/:skill/stats — real aggregates for one skill (by name).
 */
const getSkillStats = asyncHandler(async (req, res) => {
  const skill = req.params.skill;
  const rx = new RegExp(`^${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

  const [agg] = await Gig.aggregate([
    { $match: { status: 'active', skills: rx } },
    {
      $group: {
        _id: null,
        totalGigs: { $sum: 1 },
        freelancers: { $addToSet: '$freelancerId' },
        avgRating: { $avg: '$stats.rating' },
        minPrice: { $min: '$pricing.basic.price' },
      },
    },
  ]);

  sendSuccess(res, {
    message: 'Skill stats',
    data: {
      skill,
      totalGigs: agg?.totalGigs || 0,
      totalFreelancers: agg?.freelancers?.length || 0,
      avgRating: agg?.avgRating ? Number(agg.avgRating.toFixed(1)) : 0,
      startingPrice: agg?.minPrice || 0,
    },
  });
});

/**
 * GET /public/trending — top skills by active-gig volume (real demand signal).
 */
const getTrending = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 9, 24);

  const trending = await Gig.aggregate([
    { $match: { status: 'active' } },
    { $unwind: '$skills' },
    {
      $group: {
        _id: '$skills',
        gigs: { $sum: 1 },
        avgPrice: { $avg: '$pricing.basic.price' },
        avgRating: { $avg: '$stats.rating' },
      },
    },
    { $sort: { gigs: -1 } },
    { $limit: limit },
  ]);

  sendSuccess(res, {
    message: 'Trending skills',
    data: {
      skills: trending.map((t) => ({
        name: t._id,
        slug: slugify(t._id),
        gigs: t.gigs,
        avgPrice: t.avgPrice ? Math.round(t.avgPrice) : 0,
        avgRating: t.avgRating ? Number(t.avgRating.toFixed(1)) : 0,
      })),
    },
  });
});

/**
 * GET /public/top-freelancers — real top-rated freelancers for the
 * "success stories" / testimonials section. Ranked by rating then completed
 * projects; only includes freelancers with a title + at least one skill.
 */
const getTopFreelancers = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 6, 12);

  const profiles = await FreelancerProfile.find({
    title: { $exists: true, $ne: '' },
    'skills.0': { $exists: true },
  })
    .populate('userId', 'firstName lastName profilePicture rating')
    .sort({ rating: -1, completedProjects: -1 })
    .limit(limit);

  const freelancers = profiles
    .filter((p) => p.userId)
    .map((p) => {
      const u = p.userId;
      return {
        id: String(u._id),
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Freelancer',
        role: p.title,
        avatar: u.profilePicture || null,
        rating: p.rating || u.rating || 0,
        completedProjects: p.completedProjects || 0,
        totalEarnings: p.totalEarnings || 0,
        skills: (p.skills || []).map((s) => (typeof s === 'object' ? s.name : s)).filter(Boolean).slice(0, 4),
        bio: p.bio || '',
      };
    });

  sendSuccess(res, { message: 'Top freelancers', data: { freelancers } });
});

/**
 * POST /public/contact — store a contact-form submission.
 * Body: { name, email, subject, message }
 */
const submitContact = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    throw new BadRequestError('Name, email and message are required');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    throw new BadRequestError('Please provide a valid email address');
  }

  await ContactMessage.create({
    name: String(name).slice(0, 120),
    email: String(email).slice(0, 160),
    subject: subject ? String(subject).slice(0, 200) : '',
    message: String(message).slice(0, 4000),
    meta: { ip: req.ip, userAgent: req.get('User-Agent') },
  });

  sendCreated(res, 'Message received', { received: true });
});

module.exports = {
  getStats,
  getCategories,
  getCategoryStats,
  getSkillStats,
  getTrending,
  getTopFreelancers,
  submitContact,
};
