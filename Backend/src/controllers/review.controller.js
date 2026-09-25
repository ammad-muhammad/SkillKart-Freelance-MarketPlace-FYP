const Review = require('../models/Review');
const Job = require('../models/Job');
const User = require('../models/User');
const { asyncHandler } = require('../utils/helpers');
const { sendSuccess } = require('../utils/apiResponse');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/apiError');
const { recalculateRating } = require('../services/rating.service');
const notifications = require('../services/notification.service');

/**
 * Get reviews for a user (freelancer or client)
 */
const getReviews = asyncHandler(async (req, res) => {
  const { revieweeId, type } = req.query;

  if (!revieweeId) {
    throw new BadRequestError('revieweeId is required');
  }

  const query = {
    revieweeId,
    isHidden: { $ne: true }
  };

  if (type) {
    query.type = type;
  }

  const reviews = await Review.find(query)
    .populate('reviewerId', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, {
    message: 'Reviews retrieved successfully',
    data: { reviews }
  });
});

/**
 * Create a new review
 */
const createReview = asyncHandler(async (req, res) => {
  const reviewerId = req.user._id;
  const { revieweeId, rating, comment, jobId } = req.body;

  if (!revieweeId) {
    throw new BadRequestError('revieweeId is required');
  }

  if (String(reviewerId) === String(revieweeId)) {
    throw new BadRequestError('You cannot review yourself');
  }

  const numericRating = Number(rating);
  if (!numericRating || numericRating < 1 || numericRating > 5) {
    throw new BadRequestError('Rating must be between 1 and 5');
  }

  const targetUser = await User.findById(revieweeId);
  if (!targetUser) {
    throw new NotFoundError('Target user not found');
  }

  // Determine review type:
  // If target is freelancer -> client_to_freelancer
  // If target is client -> freelancer_to_client
  let type = 'client_to_freelancer';
  if (targetUser.role === 'client') {
    type = 'freelancer_to_client';
  } else if (targetUser.role === 'freelancer') {
    type = 'client_to_freelancer';
  } else if (req.user.role === 'client') {
    type = 'client_to_freelancer';
  } else {
    type = 'freelancer_to_client';
  }

  // Check if reviewer already reviewed
  if (jobId) {
    const existing = await Review.findOne({ jobId, reviewerId });
    if (existing) {
      throw new BadRequestError('You have already reviewed this project. You can edit your review.');
    }
  } else {
    const existing = await Review.findOne({ revieweeId, reviewerId, type });
    if (existing) {
      throw new BadRequestError('You have already submitted a review for this profile. You can edit your review.');
    }
  }

  // If no jobId passed, look for any completed job between these two users to link
  let finalJobId = jobId || null;
  if (!finalJobId) {
    const completedJob = await Job.findOne({
      $or: [
        { clientId: reviewerId, hiredFreelancer: revieweeId },
        { clientId: revieweeId, hiredFreelancer: reviewerId }
      ],
      status: 'completed'
    }).select('_id');
    if (completedJob) {
      finalJobId = completedJob._id;
    }
  }

  const review = new Review({
    jobId: finalJobId,
    reviewerId,
    revieweeId,
    rating: numericRating,
    comment: (comment || '').trim(),
    type
  });

  await review.save();
  await recalculateRating(review);

  // Send notification if applicable
  const reviewerName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Someone';
  try {
    notifications.onReviewSubmitted(revieweeId, { reviewerName, job: { title: 'Profile Endorsement' } });
  } catch (err) {
    // Non-fatal
  }

  const populated = await Review.findById(review._id)
    .populate('reviewerId', 'firstName lastName profilePicture')
    .lean();

  sendSuccess(res, {
    message: 'Review submitted successfully',
    data: { review: populated }
  });
});

/**
 * Update an existing review
 */
const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const reviewerId = req.user._id;

  const review = await Review.findById(id);
  if (!review) {
    throw new NotFoundError('Review not found');
  }

  if (String(review.reviewerId) !== String(reviewerId)) {
    throw new ForbiddenError('You can only edit your own review');
  }

  if (rating !== undefined) {
    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      throw new BadRequestError('Rating must be between 1 and 5');
    }
    review.rating = numericRating;
  }

  if (comment !== undefined) {
    review.comment = (comment || '').trim();
  }

  await review.save();
  await recalculateRating(review);

  const populated = await Review.findById(review._id)
    .populate('reviewerId', 'firstName lastName profilePicture')
    .lean();

  sendSuccess(res, {
    message: 'Review updated successfully',
    data: { review: populated }
  });
});

/**
 * Delete an existing review
 */
const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const reviewerId = req.user._id;

  const review = await Review.findById(id);
  if (!review) {
    throw new NotFoundError('Review not found');
  }

  if (String(review.reviewerId) !== String(reviewerId)) {
    throw new ForbiddenError('You can only delete your own review');
  }

  await Review.findByIdAndDelete(id);
  await recalculateRating(review);

  sendSuccess(res, {
    message: 'Review deleted successfully'
  });
});

module.exports = {
  getReviews,
  createReview,
  updateReview,
  deleteReview
};
