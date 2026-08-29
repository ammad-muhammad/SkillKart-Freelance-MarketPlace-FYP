const FreelancerProfile = require('../models/FreelancerProfile');
const ClientProfile = require('../models/ClientProfile');
const Gig = require('../models/Gig');

/**
 * finalizeJobCompletion — runs the side-effects when a job becomes 'completed':
 * stats roll-up for both parties. Payment release is handled separately by the
 * payment service (Phase 4); this focuses on profile stats (Phase 5).
 *
 * Safe to call once per completion. Failures here must NOT block the completion
 * response, so callers should wrap in try/catch and log.
 *
 * @param {object} job  the completed Job document (with clientId + hiredFreelancer)
 * @param {object} [opts]
 * @param {number} [opts.freelancerEarning]  amount credited to the freelancer
 *                                            (net of platform fee). Falls back to
 *                                            the job budget midpoint when omitted.
 * @param {boolean} [opts.skipEarningsCredit]  true when the caller already
 *   credited the freelancer's wallet AND totalEarnings itself (e.g.
 *   milestone.service.js's releaseMilestone(), called once per milestone —
 *   including the final one, before this function runs) — this then only
 *   bumps `completedProjects` (which releaseMilestone never touches) instead
 *   of crediting the same payout to the freelancer a second time.
 */
async function finalizeJobCompletion(job, opts = {}) {
  if (!job) return;
  if (job.statsRolledUp) {
    throw new Error('Stats have already been rolled up for this job.');
  }

  // Determine the monetary amounts. When a payment record drives completion it
  // passes the exact net earning; otherwise estimate from the job budget.
  const budgetMid = (() => {
    const min = Number(job.budget?.min) || 0;
    const max = Number(job.budget?.max) || 0;
    if (min && max) return (min + max) / 2;
    return max || min || 0;
  })();
  const freelancerEarning = Number.isFinite(opts.freelancerEarning) ? opts.freelancerEarning : budgetMid;
  const clientSpend = Number.isFinite(opts.clientSpend) ? opts.clientSpend : budgetMid;

  // ── Freelancer stats ──
  if (job.hiredFreelancer) {
    const inc = { completedProjects: 1 };
    if (!opts.skipEarningsCredit) {
      inc.totalEarnings = Math.round(freelancerEarning);
      inc.walletBalance = Number(freelancerEarning.toFixed(2));
    }
    await FreelancerProfile.updateOne({ userId: job.hiredFreelancer }, { $inc: inc });
  }

  // ── Client stats ──
  if (job.clientId) {
    await ClientProfile.updateOne(
      { userId: job.clientId },
      {
        $inc: {
          totalSpent: Math.round(clientSpend),
        },
      }
    );
  }

  // ── Gig order → bump the source gig's completed-order count ──
  if (job.source === 'gig' && job.gigId) {
    await Gig.updateOne({ _id: job.gigId }, { $inc: { 'stats.orders': 1 } });
  }

  job.statsRolledUp = true;
  await job.save();
}

module.exports = { finalizeJobCompletion };
