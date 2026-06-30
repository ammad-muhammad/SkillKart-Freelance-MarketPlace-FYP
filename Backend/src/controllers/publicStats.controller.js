const Gig = require('../models/Gig');
const Job = require('../models/Job');
const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');
const ContactMessage = require('../models/ContactMessage');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { BadRequestError } = require('../utils/apiError');
const { JOB_CATEGORIES, CATEGORY_GROUPS } = require('../utils/constants');
const { sendEmail } = require('../services/email.service');
const config = require('../config');

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Icon and gradient for every category in the taxonomy.
// Falls back to the 'Other' entry for any unmapped category.
const CATEGORY_META = {
  // Software & Technology
  'Web Development':          { icon: '🌐', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  'Mobile Development':       { icon: '📱', gradient: 'linear-gradient(135deg,#0ea5e9,#22d3ee)' },
  'Frontend Development':     { icon: '🖥️', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  'Backend Development':      { icon: '⚙️', gradient: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' },
  'Full Stack Development':   { icon: '💻', gradient: 'linear-gradient(135deg,#7c3aed,#6366f1)' },
  'DevOps & Cloud':           { icon: '☁️', gradient: 'linear-gradient(135deg,#06b6d4,#0ea5e9)' },
  'Cybersecurity':            { icon: '🛡️', gradient: 'linear-gradient(135deg,#ef4444,#f43f5e)' },
  'AI & Machine Learning':    { icon: '🤖', gradient: 'linear-gradient(135deg,#10b981,#34d399)' },
  'Data Science':             { icon: '📊', gradient: 'linear-gradient(135deg,#0284c7,#38bdf8)' },
  'Blockchain':               { icon: '⛓️', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  'Game Development':         { icon: '🎮', gradient: 'linear-gradient(135deg,#7c3aed,#c084fc)' },
  'QA & Testing':             { icon: '🧪', gradient: 'linear-gradient(135deg,#059669,#10b981)' },
  // Design
  'UI Design':                { icon: '🎨', gradient: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
  'UX Design':                { icon: '🖌️', gradient: 'linear-gradient(135deg,#a855f7,#ec4899)' },
  'Graphic Design':           { icon: '🖼️', gradient: 'linear-gradient(135deg,#f97316,#f59e0b)' },
  'Logo Design':              { icon: '✏️', gradient: 'linear-gradient(135deg,#3b82f6,#6366f1)' },
  'Brand Identity':           { icon: '💎', gradient: 'linear-gradient(135deg,#0f766e,#14b8a6)' },
  'Product Design':           { icon: '📐', gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)' },
  'Illustration':             { icon: '🖊️', gradient: 'linear-gradient(135deg,#ef4444,#f97316)' },
  'Motion Graphics':          { icon: '🎞️', gradient: 'linear-gradient(135deg,#8b5cf6,#6366f1)' },
  // Video & Photography
  'Video Editing':            { icon: '🎬', gradient: 'linear-gradient(135deg,#1d4ed8,#7c3aed)' },
  'Videography':              { icon: '🎥', gradient: 'linear-gradient(135deg,#0f172a,#1e293b)' },
  'Photography':              { icon: '📷', gradient: 'linear-gradient(135deg,#78716c,#57534e)' },
  'Drone Photography':        { icon: '🚁', gradient: 'linear-gradient(135deg,#0284c7,#0ea5e9)' },
  'Cinematography':           { icon: '🎞️', gradient: 'linear-gradient(135deg,#7c2d12,#b91c1c)' },
  'Color Grading':            { icon: '🌈', gradient: 'linear-gradient(135deg,#a855f7,#3b82f6)' },
  'Visual Effects (VFX)':     { icon: '✨', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  'Animation':                { icon: '🎭', gradient: 'linear-gradient(135deg,#ec4899,#8b5cf6)' },
  '3D Animation':             { icon: '🧊', gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
  // Writing & Content
  'Copywriting':              { icon: '📝', gradient: 'linear-gradient(135deg,#b45309,#d97706)' },
  'Technical Writing':        { icon: '📄', gradient: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' },
  'Content Writing':          { icon: '✍️', gradient: 'linear-gradient(135deg,#f59e0b,#f97316)' },
  'Ghostwriting':             { icon: '👻', gradient: 'linear-gradient(135deg,#64748b,#94a3b8)' },
  'Script Writing':           { icon: '🎬', gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
  'Translation':              { icon: '🌍', gradient: 'linear-gradient(135deg,#0f766e,#0ea5e9)' },
  'Proofreading':             { icon: '🔍', gradient: 'linear-gradient(135deg,#059669,#34d399)' },
  // Marketing
  'SEO':                      { icon: '🔎', gradient: 'linear-gradient(135deg,#3b82f6,#6366f1)' },
  'SEM':                      { icon: '📈', gradient: 'linear-gradient(135deg,#0ea5e9,#3b82f6)' },
  'Social Media Marketing':   { icon: '📣', gradient: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
  'Email Marketing':          { icon: '📧', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  'Affiliate Marketing':      { icon: '🤝', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  'PPC Advertising':          { icon: '💰', gradient: 'linear-gradient(135deg,#dc2626,#ef4444)' },
  'Influencer Marketing':     { icon: '⭐', gradient: 'linear-gradient(135deg,#f59e0b,#ec4899)' },
  'Branding':                 { icon: '🏆', gradient: 'linear-gradient(135deg,#7c3aed,#6366f1)' },
  // Business
  'Project Management':       { icon: '📋', gradient: 'linear-gradient(135deg,#0f766e,#14b8a6)' },
  'Virtual Assistance':       { icon: '💼', gradient: 'linear-gradient(135deg,#1d4ed8,#6366f1)' },
  'Business Consulting':      { icon: '🧠', gradient: 'linear-gradient(135deg,#0284c7,#0ea5e9)' },
  'Market Research':          { icon: '🔬', gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
  'Customer Support':         { icon: '🎧', gradient: 'linear-gradient(135deg,#059669,#10b981)' },
  'Recruitment':              { icon: '👥', gradient: 'linear-gradient(135deg,#f97316,#f59e0b)' },
  'Data Entry':               { icon: '⌨️', gradient: 'linear-gradient(135deg,#64748b,#475569)' },
  // Audio & Music
  'Voice Over':               { icon: '🎙️', gradient: 'linear-gradient(135deg,#7c3aed,#ec4899)' },
  'Audio Editing':            { icon: '🎛️', gradient: 'linear-gradient(135deg,#0f172a,#1e293b)' },
  'Music Production':         { icon: '🎵', gradient: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
  'Mixing & Mastering':       { icon: '🎚️', gradient: 'linear-gradient(135deg,#a855f7,#7c3aed)' },
  'Podcast Production':       { icon: '🎤', gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
  'Sound Design':             { icon: '🔊', gradient: 'linear-gradient(135deg,#059669,#0ea5e9)' },
  // Architecture & Engineering
  'CAD Design':               { icon: '📏', gradient: 'linear-gradient(135deg,#78716c,#44403c)' },
  'Interior Design':          { icon: '🛋️', gradient: 'linear-gradient(135deg,#b45309,#d97706)' },
  'Exterior Design':          { icon: '🏠', gradient: 'linear-gradient(135deg,#0f766e,#14b8a6)' },
  'Structural Design':        { icon: '🏗️', gradient: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' },
  'Mechanical Design':        { icon: '🔧', gradient: 'linear-gradient(135deg,#475569,#64748b)' },
  // Finance & Legal
  'Accounting':               { icon: '💹', gradient: 'linear-gradient(135deg,#059669,#10b981)' },
  'Bookkeeping':              { icon: '📒', gradient: 'linear-gradient(135deg,#0284c7,#0ea5e9)' },
  'Financial Analysis':       { icon: '📉', gradient: 'linear-gradient(135deg,#dc2626,#f97316)' },
  'Tax Preparation':          { icon: '🧾', gradient: 'linear-gradient(135deg,#7c3aed,#6366f1)' },
  'Legal Consulting':         { icon: '⚖️', gradient: 'linear-gradient(135deg,#44403c,#78716c)' },
  // Catch-all
  'Other':                    { icon: '✨', gradient: 'linear-gradient(135deg,#64748b,#94a3b8)' },
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

  // Reverse-map each category to its industry group
  const categoryToGroup = {};
  Object.entries(CATEGORY_GROUPS).forEach(([group, cats]) => {
    cats.forEach(cat => { categoryToGroup[cat] = group; });
  });

  const categories = JOB_CATEGORIES.map((name) => ({
    name,
    slug: slugify(name),
    icon: (CATEGORY_META[name] || CATEGORY_META.Other).icon,
    gradient: (CATEGORY_META[name] || CATEGORY_META.Other).gradient,
    group: categoryToGroup[name] || 'Other',
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

  // Send the email via SMTP to the platform's support inbox (using the configured sender email)
  const supportEmail = config.email.from || config.email.user || 'support@skillkart.app';
  const emailSubject = `New Contact Form Submission: ${subject || 'General Inquiry'}`;
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #4F46E5; margin-top: 0;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject || 'None provided'}</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p><strong>Message:</strong></p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; white-space: pre-wrap;">
          ${message}
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await sendEmail(supportEmail, emailSubject, emailHtml);
  } catch (err) {
    console.error("Failed to send contact SMTP email:", err);
    // Don't fail the request if the email fails, since it's already saved to the database.
  }

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
