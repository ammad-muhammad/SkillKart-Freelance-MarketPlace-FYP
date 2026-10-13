const Testimonial = require('../models/Testimonial');
const FreelancerProfile = require('../models/FreelancerProfile');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { BadRequestError } = require('../utils/apiError');
const { stripHtml } = require('../utils/sanitizeInput');

/**
 * POST /testimonials — freelancer submits (or updates) their success story.
 * One testimonial per freelancer (upsert).
 */
const submitTestimonial = asyncHandler(async (req, res) => {
  const { text, rating } = req.body;
  const user = req.user;

  if (!text || String(text).trim().length < 20) {
    throw new BadRequestError('Please write at least 20 characters about your experience.');
  }

  const profile = await FreelancerProfile.findOne({ userId: user._id }).lean();
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || (user.email ? user.email.split('@')[0] : 'Freelancer');

  const doc = await Testimonial.findOneAndUpdate(
    { userId: user._id },
    {
      userId: user._id,
      name,
      role: profile?.title || '',
      // Every other free-text field in this app goes through stripHtml
      // before persisting (removes the stored-XSS risk outright) — this is
      // the one place that skipped it despite being served unauthenticated
      // on the public homepage.
      text: stripHtml(String(text).trim().slice(0, 600)),
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      status: 'approved', // auto-approve for the demo
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  sendCreated(res, 'Your story has been shared. Thank you!', { testimonial: doc });
});

/**
 * GET /testimonials/me — the logged-in freelancer's own testimonial (or null).
 */
const getMyTestimonial = asyncHandler(async (req, res) => {
  const testimonial = await Testimonial.findOne({ userId: req.user._id });
  sendSuccess(res, { message: 'My testimonial', data: { testimonial: testimonial || null } });
});

/**
 * DELETE /testimonials/me — remove the freelancer's own testimonial.
 */
const deleteMyTestimonial = asyncHandler(async (req, res) => {
  await Testimonial.deleteOne({ userId: req.user._id });
  sendSuccess(res, { message: 'Your story was removed.' });
});

/**
 * GET /public/testimonials — approved testimonials for the homepage, enriched
 * with the freelancer's real avatar + completed-project count.
 */
const getPublicTestimonials = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 6, 12);

  const testimonials = await Testimonial.find({ status: 'approved' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName profilePicture')
    .lean();

  // Pull each author's completed-project count for the card stats.
  const userIds = testimonials.map((t) => t.userId?._id).filter(Boolean);
  const profiles = await FreelancerProfile.find({ userId: { $in: userIds } })
    .select('userId completedProjects totalEarnings')
    .lean();
  const profByUser = new Map(profiles.map((p) => [String(p.userId), p]));

  const data = testimonials.map((t) => {
    const u = t.userId || {};
    const p = profByUser.get(String(u._id)) || {};
    return {
      id: String(t._id),
      name: t.name,
      role: t.role,
      text: t.text,
      rating: t.rating,
      avatarUrl: u.profilePicture || null,
      completedProjects: p.completedProjects || 0,
      totalEarnings: p.totalEarnings || 0,
    };
  });

  sendSuccess(res, { message: 'Testimonials', data: { testimonials: data } });
});

module.exports = {
  submitTestimonial,
  getMyTestimonial,
  deleteMyTestimonial,
  getPublicTestimonials,
};
