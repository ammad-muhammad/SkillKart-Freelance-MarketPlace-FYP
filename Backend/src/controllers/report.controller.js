const Report = require('../models/Report');
const User = require('../models/User');
const Job = require('../models/Job');
const Gig = require('../models/Gig');
const Review = require('../models/Review');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError, BadRequestError } = require('../utils/apiError');
const { stripHtml } = require('../utils/sanitizeInput');

/**
 * Resolve WHO is being reported from the reported item itself, on the server —
 * never from a client-supplied user id, so a report can't be pointed at an
 * arbitrary account. Returns the owner's user id.
 */
const resolveReportedUser = async (itemType, itemId) => {
  switch (itemType) {
    case 'profile': {
      const user = await User.findById(itemId).select('_id isSystemAccount').lean();
      if (!user || user.isSystemAccount) throw new NotFoundError('That profile was not found');
      return user._id;
    }
    case 'job': {
      const job = await Job.findById(itemId).select('clientId').lean();
      if (!job) throw new NotFoundError('That job was not found');
      return job.clientId;
    }
    case 'gig': {
      const gig = await Gig.findById(itemId).select('freelancerId').lean();
      if (!gig) throw new NotFoundError('That gig was not found');
      return gig.freelancerId;
    }
    case 'review': {
      const review = await Review.findById(itemId).select('reviewerId').lean();
      if (!review) throw new NotFoundError('That review was not found');
      return review.reviewerId;
    }
    default:
      throw new BadRequestError('That cannot be reported');
  }
};

/**
 * POST /reports — file a report about a profile, job, gig or review. It lands in
 * the admin panel's Reports queue (moderation.controller.js), which could already
 * triage reports but had nothing that created one.
 */
const createReport = asyncHandler(async (req, res) => {
  const { itemType, itemId, category } = req.body;
  const description = stripHtml(req.body.description || '').trim();
  if (description.length < 10) throw new BadRequestError('Please describe the problem (at least 10 characters)');

  const reportedUser = await resolveReportedUser(itemType, itemId);
  if (String(reportedUser) === String(req.user._id)) {
    throw new BadRequestError("You can't report your own content");
  }

  // One open report per person per item: a second click is answered kindly, not
  // queued again, so one user can't flood the moderators about the same thing.
  const open = await Report.findOne({
    reportedBy: req.user._id,
    'reportedItem.type': itemType,
    'reportedItem.id': itemId,
    status: { $in: ['pending', 'investigating'] },
  }).select('_id').lean();
  if (open) {
    return sendSuccess(res, { message: 'You have already reported this. Our moderators are looking into it.', data: { reportId: open._id, duplicate: true } });
  }

  const report = await Report.create({
    reportedBy: req.user._id,
    reportedUser,
    reportedItem: { type: itemType, id: itemId },
    category,
    description,
    // Decided here, not by the client: fraud and harassment jump the queue.
    priority: ['fraud', 'harassment'].includes(category) ? 'high' : 'medium',
  });

  sendCreated(res, 'Thank you — your report was sent to our moderation team.', { reportId: report._id });
});

module.exports = { createReport };
