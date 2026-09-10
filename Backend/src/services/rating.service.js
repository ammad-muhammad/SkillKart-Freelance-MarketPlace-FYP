const Review = require('../models/Review');
const Job = require('../models/Job');
const FreelancerProfile = require('../models/FreelancerProfile');
const ClientProfile = require('../models/ClientProfile');
const Gig = require('../models/Gig');

/**
 * Recompute a user's aggregate rating from their non-hidden reviews, and
 * (for client_to_freelancer reviews on a gig-sourced job) the source gig's
 * own rating/reviewsCount stats.
 *
 * Called both right after a new review is submitted (job.controller.js's
 * reviewJob) and whenever admin moderation changes a review's visibility
 * (adminPanel/moderation.controller.js's hideReview/restoreReview/
 * deleteReview) — hiding an abusive/fake review must stop it counting
 * toward the score immediately, not just the next time some unrelated new
 * review happens to trigger a recalculation.
 *
 * @param {{ revieweeId: any, type: string, jobId?: any }} review
 */
async function recalculateRating({ revieweeId, type, jobId }) {
  const allReviews = await Review.find({ revieweeId, type, isHidden: false }).select('rating').lean();
  const avgRating = allReviews.length > 0
    ? allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length
    : 0;

  if (type === 'client_to_freelancer') {
    await FreelancerProfile.findOneAndUpdate({ userId: revieweeId }, { rating: avgRating });
  } else {
    await ClientProfile.findOneAndUpdate({ userId: revieweeId }, { rating: avgRating });
  }

  if (type === 'client_to_freelancer' && jobId) {
    const job = await Job.findById(jobId).select('source gigId').lean();
    if (job?.source === 'gig' && job.gigId) {
      const gigJobs = await Job.find({ gigId: job.gigId }).select('_id').lean();
      const gigJobIds = gigJobs.map((j) => j._id);
      const gigReviews = await Review.find({ jobId: { $in: gigJobIds }, type: 'client_to_freelancer', isHidden: false }).select('rating').lean();
      const gigAvgRating = gigReviews.length > 0
        ? gigReviews.reduce((acc, r) => acc + r.rating, 0) / gigReviews.length
        : 0;
      await Gig.findByIdAndUpdate(job.gigId, {
        'stats.rating': gigAvgRating,
        'stats.reviewsCount': gigReviews.length
      });
    }
  }
}

module.exports = { recalculateRating };
